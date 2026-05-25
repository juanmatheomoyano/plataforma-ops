#!/bin/bash
# Script de configuración inicial del servidor (requiere sudo)
# Ejecutar una sola vez: bash /home/juan/plataforma-ops/deploy/setup-server.sh
set -e

REPO=/home/juan/plataforma-ops

echo "=== 1/5 Copiando servicio systemd ==="
sudo cp "$REPO/deploy/plataforma-backend.service" /etc/systemd/system/plataforma-backend.service
sudo systemctl daemon-reload
sudo systemctl enable plataforma-backend

echo "=== 2/5 Matando procesos de desarrollo ==="
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "=== 3/5 Iniciando backend con systemd ==="
sudo systemctl start plataforma-backend
sleep 3
sudo systemctl status plataforma-backend --no-pager

echo "=== 4/5 Configurando Nginx ==="
sudo cp "$REPO/deploy/plataforma-ops.nginx" /etc/nginx/sites-available/plataforma-ops
sudo ln -sf /etc/nginx/sites-available/plataforma-ops /etc/nginx/sites-enabled/plataforma-ops
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "=== 5/5 Verificando ==="
sleep 2
curl -s http://localhost/api/health
echo ""
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MiPassword123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'][:40])...")
echo "Login token: $TOKEN"

echo "=== Setup completado. App disponible en http://192.168.1.96 ==="
