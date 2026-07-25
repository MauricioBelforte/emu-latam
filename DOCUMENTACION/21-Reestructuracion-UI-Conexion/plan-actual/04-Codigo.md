# Código - Reestructuración UI de Conexión (PLAN ACTUAL)

## Fase A: Debug del Relay TCP↔UDP

### A.1 Archivos a revisar/debuggear

| Archivo | Líneas clave | Qué revisar |
|---------|--------------|-------------|
| `client/src/main/bootstrapGgpoRelay.ts` | 40-65 (`startBoreTunnel`) | ¿No mata el bore de Nakama? Usa proceso propio `ggpoHostBoreProc` |
| `client/src/main/bootstrapGgpoRelay.ts` | 67-119 (`handleBootstrapGgpoRelayHost`) | ¿UDP relay escucha bien? ¿TCP bridge reenvía a puerto correcto? |
| `client/src/main/bootstrapGgpoRelay.ts` | 122-175 (`handleBootstrapGgpoRelayGuest`) | ¿Conecta TCP al bore? ¿UDP forwarder recibe data? |
| `client/src/main/index.ts` | L1041-1063 | ¿IPCs registrados correctamente? |
| `client/src/context/ChallengeContext.tsx` | L270-283 (host ACCEPT GGPO bootstrap) | ¿Llama a `bootstrap-ggpo-relay-host` con `targetUdpPort: 6003`? |
| `client/src/context/ChallengeContext.tsx` | L379-393 (guest conn_info GGPO bootstrap) | ¿Llama a `bootstrap-ggpo-relay-guest` con `forwarderUdpPort` y `targetUdpPort: 6004`? |
| `client/src/context/ChallengeContext.tsx` | L393-406 (RetroArch conn_info bootstrap) | ¿Llama a `bootstrap-ggpo-relay-guest` con `targetUdpPort: 55435`? |

### A.2 Procedimiento de debug

1. **Verificar que startBoreTunnel no mate el bore Nakama:**
   - Host crea sala verde (llama `bootstrap-host` → `startNakamaBore`)
   - Revisar que `ggpoHostBoreProc` esté separado de `nakamaBoreProcess`
   - `startBoreTunnel` NO debe hacer `execSync("taskkill /f /im bore.exe")`

   ```typescript
   // CÓDIGO ACTUAL (correcto si no usa taskkill):
   function startBoreTunnel(localPort: number): Promise<string | null> {
     // Solo maneja su propio proceso ggpoHostBoreProc
     if (ggpoHostBoreProc) { try { ggpoHostBoreProc.kill(); } catch {} }
   ```

2. **Verificar relay host con un echo UDP server:**
   ```bash
   # Terminal 1: echo UDP server en puerto 6003
   node -e "const d=require('dgram'); const s=d.createSocket('udp4'); s.on('message',(m,r)=>{console.log('recv',m.toString()); s.send('ECHO:'+m, r.port, r.address);}); s.bind(6003); console.log('listening')"
   
   # Terminal 2: enviar UDP al relay
   node -e "const d=require('dgram'); const s=d.createSocket('udp4'); s.send('HOLA', RELAY_PORT, '127.0.0.1'); s.on('message',m=>console.log(m.toString()))"
   ```

3. **Verificar bridge guest:**
   - Host crea bridge + bore
   - Guest conecta TCP al bore URL
   - Guest envía UDP al forwarderPort
   - Debería recibir eco desde el host

### A.3 Si el relay no funciona: Plan B

Simplificar: en vez de TCP↔UDP bridge, usar directamente el puerto del bore de Nakama para reenviar datos de juego. Aunque bore es TCP, podemos crear un proxy en Node.js que:

```
Guest GGPO → UDP → [Node.js proxy] → TCP → bore → [Node.js proxy] → UDP → Host GGPO
```

Este proxy ya está implementado en `bootstrapGgpoRelay.ts`. Si no funciona, debuggear ahí.

## Fase B: UI Simplificada

### B.1 Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `client/src/App.tsx` | Agregar `salaType`, reemplazar secciones fucsia+verde, eliminar colapsable |
| `client/src/context/ChallengeContext.tsx` | Agregar `salaType` a `ChallengeData`, sincronizar con nuevo estado |
| `client/src/components/ui/MethodPicker.tsx` | (Si existe) Hacerlo dinámico, o modificar la lógica inline |
| `client/src/components/ui/ChallengeModal.tsx` | (Si existe) Pasar `salaType` al picker |

### B.2 Código nuevo en App.tsx

```typescript
// NUEVO estado (junto a los existentes, sin eliminarlos)
const [salaType, setSalaType] = useState<"tailscale" | "p2p" | null>(null);

// Handlers unificados

const handleCreateP2pSala = async () => {
  setSalaType("p2p");
  setBootstrapLoading(true);
  const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-host");
  if (result.success && result.roomCode) {
    setBootstrapRoomCode(result.roomCode);
    setBootstrapBoreUrl(result.boreUrl || "");
    setIsBootstrapSala(true);    // ← temporal, compatibilidad
    setIsP2pSala(false);
    setJoinMode("create");
    await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: "127.0.0.1", port: "7350" });
    setNakamaHost("127.0.0.1"); setNakamaPort("7350");
    await loginGhost();
  } else {
    alert("Error: " + (result.error || "desconocido"));
  }
  setBootstrapLoading(false);
};

const handleJoinP2pSala = async (code: string) => {
  setSalaType("p2p");
  setBootstrapLoading(true);
  const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-guest", { roomCode: code.trim() });
  if (result.success) {
    setBootstrapBoreUrl(result.boreUrl);
    setIsBootstrapSala(true);    // ← temporal
    setJoinMode(null);
    const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
    if (ok) {
      setNakamaReady(true);
      await loginGhost();
    } else {
      alert("Conectado pero Nakama remoto no responde");
    }
  } else {
    alert("Error: " + (result.error || "desconocido"));
  }
  setBootstrapLoading(false);
};
```

### B.3 JSX nuevo para la sección P2P (reemplaza fucsia + verde)

```tsx
{/* ─── SALA P2P (unificada) ─── */}
<Section $accent="#0f0" style={{ borderStyle: "solid", borderWidth: 2, borderColor: "#0f08", padding: "16px" }}>
  <p style={{ color: "#0f0", fontFamily: theme.fonts.arcade, fontSize: "0.65rem", marginBottom: 10, textAlign: "center" }}>
    ▸ SALA P2P (SIN TAILSCALE) ◂
  </p>
  {bootstrapRoomCode ? (
    // Host: código generado
    <div style={{ textAlign: "center" }}>
      <StatusText $color="#0f0" style={{ fontSize: "1.4rem", fontWeight: "bold" }}>
        CÓDIGO: {bootstrapRoomCode}
      </StatusText>
      <Btn onClick={() => navigator.clipboard.writeText(bootstrapRoomCode)} $accent="#0f0" $bg="#0f022">
        📋 COPIAR
      </Btn>
      <Btn onClick={handleBootstrapClose} $accent="#f00" $bg="#500" style={{ marginTop: 8, fontSize: "0.5rem" }}>
        CERRAR
      </Btn>
    </div>
  ) : joinMode === "p2p" ? (
    // Guest: input de código
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#0f0", fontFamily: "monospace", fontSize: "0.6rem", marginBottom: 8 }}>
        Código numérico del host
      </p>
      <input type="text" value={bootstrapRoomInput} onChange={e => setBootstrapRoomInput(e.target.value)}
        placeholder="Ej: 28734" style={{ width: 140, padding: "8px", borderRadius: 4,
          border: "1px solid #0f0", background: "#111", color: "#0f0", textAlign: "center",
          fontFamily: "monospace", letterSpacing: "3px" }} />
      <Btn onClick={() => handleJoinP2pSala(bootstrapRoomInput)} $accent="#0f0" $bg="#0f022" style={{ marginLeft: 8 }}>
        CONECTAR
      </Btn>
      <Btn onClick={() => setJoinMode(null)} $accent="#555" $bg="transparent" style={{ display: "block", margin: "8px auto 0" }}>
        VOLVER
      </Btn>
    </div>
  ) : (
    // Botones iniciales
    <Row style={{ maxWidth: 480, margin: "0 auto" }}>
      <SalaButton onClick={handleCreateP2pSala} $accent="#0f0">
        CREAR SALA
        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6 }}>
          Generá un código para compartir
        </span>
      </SalaButton>
      <SalaButton onClick={() => { setJoinMode("p2p"); setBootstrapRoomInput(""); }} $accent="#0f0">
        UNIRSE A SALA
        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6 }}>
          Ingresá el código del host
        </span>
      </SalaButton>
    </Row>
  )}
</Section>
```

### B.4 Eliminar colapsable

Buscar y eliminar:
```tsx
{showOtherMethods && (
  <Collapsible title="OTROS MÉTODOS DE CONEXIÓN" ...>
    // ... todo el contenido ...
  </Collapsible>
)}
```

Y reemplazar con un botón pequeño:
```tsx
<button onClick={() => setShowDebug(true)} style={{ ... }}>
  🔧 DEBUG
</button>
```
