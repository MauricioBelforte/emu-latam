# 05 - Checklist: Automatización de Conexión

## Estado Actual — COMPLETADO

- [x] **Solución A — Storage de Nakama (implementada)**
  - [x] `publishHostInfo(ip, mode)` en NakamaService (nakama.ts)
  - [x] `fetchHostInfoForUser(targetUserId)` en NakamaService (nakama.ts)
  - [x] Host publica IP automáticamente al crear sala (App.tsx)
  - [x] Host re-publica IP cada 30s (App.tsx, useEffect existente extendido)
  - [x] Guest descubre IP automáticamente al conectarse (App.tsx, nuevo useEffect)
  - [x] Auto-completar campo "JOIN VÍA TAILSCALE" con IP detectada
  - [x] StatusText informativo: "IP del host detectada automáticamente: ..."
  - [x] `discoveryDoneRef` previene descubrimiento repetido
  - [x] Reset de discovery al desconectarse

- [x] **npm run dev**: Sin errores
- [x] **Log generado** en Logs/
