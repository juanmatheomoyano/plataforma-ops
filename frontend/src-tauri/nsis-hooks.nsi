; Hook NSIS — desinstala versiones anteriores con nombre distinto antes de instalar.
; Se ejecuta en preInit, antes de cualquier UI, de forma transparente para el usuario.

!macro preInit
  ; Buscar instalación previa "Provincia-Ops" (con guión) en HKCU y HKLM
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Provincia-Ops" "UninstallString"
  ${If} $R0 != ""
    ExecWait '"$R0" /S'
  ${EndIf}
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Provincia-Ops" "UninstallString"
  ${If} $R0 != ""
    ExecWait '"$R0" /S'
  ${EndIf}

  ; Buscar instalación previa "Provincia Ops" (con espacio) — versiones anteriores a 2.1.5
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Provincia Ops" "UninstallString"
  ${If} $R0 != ""
    ExecWait '"$R0" /S'
  ${EndIf}
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Provincia Ops" "UninstallString"
  ${If} $R0 != ""
    ExecWait '"$R0" /S'
  ${EndIf}
!macroend
