"""
Cliente SAC Payway — versión async, portada desde `descargador_sac.py`
del standalone Reporte Transacciones Payway v0.5.0-alfa (Proyecto A).

El backend hace scraping del SAC (`live.decidir.com` en prod) usando el mismo
patrón cookie-session que la app de escritorio, pero con `httpx.AsyncClient`
en lugar de `requests` para poder paralelizar cientos de sellers desde el
worker de FastAPI/Railway sin bloquear el event loop.

**Login flow:**
    GET  /sac/LoginServlet          → establece cookie de sesión inicial
    POST /sac/LoginServlet          → usuariosps + passwordsps
                                      redirect a la home si login ok,
                                      queda en LoginServlet si falla.

**Sites por usuario:**
    GET /sac/VistaBrowserServlet?sacparam_codoperacion=5
        → HTML con <select name=sacparam_idsite>. Cada <option> es un site
          asignado a ese usuario. value="1" es el placeholder "-- elegir --".

**Descarga por día:**
    GET /sac/VistaDownloadServlet?...
        → TSV (crudo). El SAC corta hard a 5000 filas por request, por eso
          descargamos día por día y consolidamos client-side.

**Re-login automático:** si el response body contiene "LoginServlet" o
tiene "login" en los primeros 200 chars, la sesión venció → re-hacemos
login y reintentamos la request de descarga.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


# ─── Endpoints y constantes ────────────────────────────────────────────────

SAC_BASE_URLS = {
    "produccion": "https://live.decidir.com",
    "sandbox": "https://developers-ventasonline.payway.com.ar",
}
SAC_LOGIN = "/sac/LoginServlet"
SAC_SITES = "/sac/VistaBrowserServlet"
SAC_DL = "/sac/VistaDownloadServlet"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
)

# Timeouts — más generosos que VTEX porque el SAC va lento.
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# 26 columnas TSV que devuelve el SAC (más "Vencido" que se calcula client-side).
TSV_COLUMNS = [
    "Id_Operacion", "Fecha_UltimaModif", "Fecha_Original", "Monto",
    "Moneda", "Cuotas", "Estado", "ResultadoCS", "Secure3d", "EstadoFinal",
    "AutentVBV", "Tarjeta", "Site", "Cod_Autoriz", "Nro_Tarjeta", "Titular",
    "Tipo_Doc", "Nro_Doc", "Motivo", "Motivo_Adicional", "Origen",
    "ValidacionDomicilio", "Wallet", "ValidacionTitular", "eMail", "TID",
]

# Diccionario reducido de estados SAC. Nombres completos → id numérico del filtro.
# El "0" es "Todos" — cubre 99% de los casos operativos.
SAC_ESTADO_IDS: dict[str, str] = {
    "Todos": "0",
    "Aprobadas": "6",           # Acreditada
    "Rechazadas": "5",
    "Anuladas": "7",
    "Devueltas": "9",
    "Vencidas": "12",
    "Pre autorizada": "11",
    "Autorizada": "4",
}


# ─── Modelos livianos ─────────────────────────────────────────────────────


@dataclass
class SACSite:
    idsite: str
    nombre: str


@dataclass
class SACLoginResult:
    ok: bool
    username: str
    sites: list[SACSite] = field(default_factory=list)
    error: str | None = None


@dataclass
class SACDayDownload:
    """Resultado de descargar 1 día para 1 site."""
    idsite: str
    day: date
    rows: list[list[str]]
    error: str | None = None


# ─── Cliente ──────────────────────────────────────────────────────────────


class SACClient:
    """
    Cliente async por-usuario. Cada instancia mantiene su propia cookie
    de sesión — instanciar UNA por usuario (no compartir instancias entre
    logins distintos, la sesión se pisa).

    Uso típico:
        async with SACClient("produccion") as client:
            ok = await client.login(user, pwd)
            if ok:
                sites = await client.get_sites()
                for s in sites:
                    rows = await client.download_day(s.idsite, day, estado_id)
    """

    def __init__(self, ambiente: str = "produccion"):
        if ambiente not in SAC_BASE_URLS:
            raise ValueError(f"ambiente inválido: {ambiente}")
        self.base = SAC_BASE_URLS[ambiente]
        self.ambiente = ambiente
        self._username: str | None = None
        self._password: str | None = None
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "SACClient":
        self._client = httpx.AsyncClient(
            timeout=_TIMEOUT,
            verify=False,  # El SAC tiene certificados intermedios que no siempre validan
            follow_redirects=True,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,*/*",
                "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
            },
        )
        return self

    async def __aexit__(self, *_):
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _ensure(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("SACClient debe usarse dentro de `async with`.")
        return self._client

    # ─── Auth ───────────────────────────────────────────────────────────

    async def login(self, username: str, password: str) -> bool:
        """
        Realiza login SAC. Guarda credenciales en la instancia para poder
        re-loguearse automáticamente si la sesión expira durante la descarga.

        Retorna True si la sesión quedó autenticada.
        Un login exitoso deja al server redirigiendo AFUERA de LoginServlet.
        Si sigue en LoginServlet, credenciales inválidas o SAC caído.
        """
        self._username = username
        self._password = password
        client = self._ensure()
        try:
            # Warm-up: obtener cookie de sesión inicial
            await client.get(self.base + SAC_LOGIN)
            resp = await client.post(
                self.base + SAC_LOGIN,
                data={"usuariosps": username, "passwordsps": password},
            )
            ok = resp.status_code == 200 and "LoginServlet" not in str(resp.url)
            if not ok:
                logger.info("sac.login failed user=%s status=%d", username, resp.status_code)
            return ok
        except Exception as e:
            logger.warning("sac.login exception user=%s: %s", username, e)
            return False

    async def _re_login_if_needed(self, response_text: str) -> bool:
        """
        Detecta si la sesión expiró durante una request. Si sí, re-loguea.
        Retorna True si logró re-loguearse (o si no hacía falta).
        """
        if "LoginServlet" not in response_text and "login" not in response_text[:200].lower():
            return True
        if not self._username or not self._password:
            return False
        logger.info("sac.session expired user=%s → relogging", self._username)
        return await self.login(self._username, self._password)

    # ─── Sites ──────────────────────────────────────────────────────────

    async def get_sites(self) -> list[SACSite]:
        """
        Obtiene la lista de sites asignados al usuario logueado.
        Parsea el `<select name="sacparam_idsite">` del HTML del browser.
        """
        client = self._ensure()
        resp = await client.get(
            self.base + SAC_SITES,
            params={"sacparam_codoperacion": "5"},
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        select = soup.find("select", {"name": "sacparam_idsite"})
        if not select:
            return []
        result: list[SACSite] = []
        for opt in select.find_all("option"):
            value = (opt.get("value", "") or "").strip()
            if value in ("", "1"):  # 1 = placeholder "-- elegir site --"
                continue
            result.append(SACSite(idsite=value, nombre=opt.get_text(strip=True)))
        return result

    # ─── Descarga ───────────────────────────────────────────────────────

    async def download_day(
        self,
        idsite: str,
        day: date,
        estado_id: str = "0",
    ) -> SACDayDownload:
        """
        Descarga TSV de 1 día para 1 site. Devuelve una lista de filas parseadas.

        El SAC responde 200 con un TSV plano (columnas TSV_COLUMNS).
        Si la sesión venció, hacemos re-login automático y reintentamos 1 vez.
        """
        client = self._ensure()
        params = {
            "sacparam_codoperacion": "5",
            "tipoconsulta": "extendida",
            "sacparam_salida": "excel",
            "sacparam_horadesde": "00:00",
            "sacparam_horahasta": "23:59",
            "sacparam_fechaini": day.strftime("%d/%m/%Y"),
            "sacparam_fechafin": day.strftime("%d/%m/%Y"),
            "sacparam_idsite": idsite,
            "sacparam_idestado": estado_id,
            "sacparam_idmediopago": "0",
            "sacparam_resultadocs": "0",
            "sacparam_resultado3ds": "0",
            "sacparam_horaini": "00",
            "sacparam_minutoini": "00",
            "sacparam_horafin": "23",
            "sacparam_minutofin": "59",
            "b_downloadform": "Download",
        }
        try:
            resp = await client.get(self.base + SAC_DL, params=params)
            text = resp.text

            # Re-login flow — la sesión venció mid-descarga
            if not await self._re_login_if_needed(text):
                return SACDayDownload(idsite=idsite, day=day, rows=[], error="Sesión expirada")

            # Reintento post-relogin (si hizo falta)
            if "LoginServlet" in text or "login" in text[:200].lower():
                resp = await client.get(self.base + SAC_DL, params=params)
                text = resp.text

            rows = parse_tsv(text)
            return SACDayDownload(idsite=idsite, day=day, rows=rows)

        except httpx.TimeoutException:
            return SACDayDownload(idsite=idsite, day=day, rows=[], error="Timeout SAC")
        except Exception as e:
            logger.warning("sac.download_day error idsite=%s day=%s: %s", idsite, day, e)
            return SACDayDownload(idsite=idsite, day=day, rows=[], error=str(e))


# ─── Helpers de parseo ────────────────────────────────────────────────────


def parse_tsv(text: str) -> list[list[str]]:
    """
    Convierte el TSV crudo del SAC en una lista de filas.
    Descarta el header (primera línea) y filas con < 23 columnas (parciales).
    Recorta a 26 columnas para alinear con TSV_COLUMNS.
    """
    rows: list[list[str]] = []
    for i, line in enumerate(text.splitlines()):
        if i == 0:
            continue  # header
        cols = line.split("\t")
        if len(cols) >= 23 and cols[0].strip():
            rows.append([c.strip() for c in cols[:26]])
    return rows


def calc_vencido(fecha_str: str, dias_anulacion: int = 90) -> str:
    """
    "Vencido" = "Sí" si pasaron más de `dias_anulacion` días desde la fecha
    original. Este cálculo NO viene del SAC, se hace client-side.
    """
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(fecha_str, fmt)
            return "Sí" if datetime.now() > dt + timedelta(days=dias_anulacion + 1) else "No"
        except ValueError:
            continue
    return ""
