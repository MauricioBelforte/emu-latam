import React, { useState, useEffect, useCallback } from "react";
import styled, { ThemeProvider, keyframes } from "styled-components";
import { useAuth } from "./context/AuthContext";
import { theme } from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppShell } from "./components/layout/AppShell";
import { ChallengeModal } from "./components/ui/ChallengeModal";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const GameCard = styled.div`
  background: linear-gradient(135deg, ${(p) => p.theme.colors.surface} 0%, ${(p) => p.theme.colors.background} 100%);
  border: 2px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 40px;
  max-width: 860px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  margin: auto;
`;

const GameTitle = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 4px;
  text-align: center;
  color: #fff;
  font-family: ${(p) => p.theme.fonts.arcade};
  span { color: ${(p) => p.theme.colors.primary}; text-shadow: ${(p) => p.theme.shadows.neonPrimary}; }
`;

const DebugInfo = styled.p`
  color: ${(p) => p.theme.colors.accent};
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.65rem;
  margin-bottom: 25px;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${(p) => p.theme.colors.border}, transparent);
  margin: 20px 0;
`;

const Section = styled.div<{ $accent?: string }>`
  width: 100%;
  border: 1px solid ${(p) => p.$accent || p.theme.colors.border};
  border-radius: 6px;
  padding: 15px;
  background: rgba(255,255,255,0.02);
  margin-bottom: 12px;
`;

const SectionHeader = styled.p<{ $color?: string }>`
  color: ${(p) => p.$color || p.theme.colors.textSecondary};
  font-family: monospace;
  font-size: 0.6rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span<{ $bg?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.55rem;
  background: ${(p) => p.$bg || "#333"};
  color: #000;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const FullRow = styled.div`
  width: 100%;
`;

const Btn = styled.button<{ $accent?: string; $bg?: string; $loading?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  letter-spacing: 1px;
  text-transform: uppercase;
  background: ${(p) => p.$bg || "transparent"};
  color: ${(p) => p.$accent || p.theme.colors.text};
  border: 2px solid ${(p) => p.$accent || p.theme.colors.border};
  cursor: pointer;
  transition: ${(p) => p.theme.transitions.default};

  &:hover:not(:disabled) {
    background: ${(p) => p.$accent || p.theme.colors.primary};
    color: #000;
    box-shadow: ${(p) => p.$accent ? `0 0 12px ${p.$accent}66` : "none"};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  animation: ${(p) => p.$loading ? pulse : "none"} 0.8s ease-in-out infinite;
`;

const Input = styled.input<{ $accent?: string }>`
  width: 100%;
  padding: 10px;
  background: #000;
  border: 1px solid ${(p) => p.$accent || "#555"};
  color: ${(p) => p.$accent || "#0f0"};
  font-family: monospace;
  font-size: 0.75rem;
  outline: none;
  transition: ${(p) => p.theme.transitions.default};
  &:focus { border-color: ${(p) => p.theme.colors.primary}; box-shadow: 0 0 8px ${(p) => p.theme.colors.primary}44; }
`;

const StatusText = styled.p<{ $color?: string }>`
  color: ${(p) => p.$color || p.theme.colors.accent};
  font-family: monospace;
  font-size: 0.65rem;
  margin-top: 6px;
  min-height: 14px;
`;

const InsertCoinButton = styled(Btn)`
  max-width: 360px;
  padding: 20px 40px;
  font-size: 1.2rem;
  border: 3px solid ${(p) => p.theme.colors.primary};
  color: ${(p) => p.theme.colors.primary};
  background: transparent;

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.primary};
    color: #000;
    box-shadow: ${(p) => p.theme.shadows.neonPrimary};
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const inline = {
  flex: { display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
  flexCol: { display: "flex", flexDirection: "column" as const },
};

function App() {
  const { loginGhost, isAuthenticated, username, isConnected } = useAuth();
  const [loading, setLoading] = useState({ bore: false, mitm: false, tsHost: false, tsJoin: false, directJoin: false });
  const [directHostIp, setDirectHostIp] = useState("");
  const [tailscaleHostIp, setTailscaleHostIp] = useState("");
  const [myTailscaleIp, setMyTailscaleIp] = useState("");
  const [tsStatus, setTsStatus] = useState("");
  const [customRelay, setCustomRelay] = useState("");
  const [statusText, setStatusText] = useState("");
  const [nakamaReady, setNakamaReady] = useState(false);
  const [nakamaHost, setNakamaHost] = useState("127.0.0.1");
  const [nakamaPort, setNakamaPort] = useState("7350");

  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await (window as any).electron.ipcRenderer.invoke("get-nakama-server");
      if (active) { setNakamaHost(cfg.host); setNakamaPort(cfg.port); }
    })();
    const check = async () => {
      while (active) {
        try {
          const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
          if (active) setNakamaReady(ok);
        } catch { if (active) setNakamaReady(false); }
        await new Promise(r => setTimeout(r, 3000));
      }
    };
    check();
    return () => { active = false; };
  }, []);

  const handleSaveNakamaServer = async () => {
    await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: nakamaHost, port: nakamaPort });
    const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
    setNakamaReady(ok);
    if (ok) alert(`Conectado a Nakama en ${nakamaHost}:${nakamaPort}`);
    else alert("No se pudo conectar al servidor Nakama. Verificá la IP y puerto.");
  };

  const handleSaveRelay = () => {
    localStorage.setItem("emu_latam_relay", customRelay);
    alert("Configuración de Relay guardada!");
  };

  const handleInsertCoin = async () => {
    console.log("INSERT COIN CLICKED");
    await loginGhost();
    const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
    if (ts.ip) setMyTailscaleIp(ts.ip);
  };

  const isHostingSala = isAuthenticated && (nakamaHost === "127.0.0.1" || nakamaHost === "localhost");

  const handleTestGame = async (isHost: boolean) => {
    let finalRelayIp = customRelay;
    try {
      if (isHost) {
        setLoading(p => ({ ...p, bore: true }));
        setStatusText("Iniciando túnel Bore...");
        const result = await (window as any).electron.ipcRenderer.invoke("start-relay-tunnel");
        if (result.success) {
          finalRelayIp = result.url;
          setCustomRelay(result.url);
          localStorage.setItem("emu_latam_relay", result.url);
          await (window as any).electron.ipcRenderer.invoke("save-relay-url", result.url);
        } else {
          alert("Error al iniciar túnel: " + result.error);
          setLoading(p => ({ ...p, bore: false }));
          return;
        }
        setLoading(p => ({ ...p, bore: false }));
      } else {
        let relayFromFile = null;
        for (let i = 0; i < 20; i++) {
          relayFromFile = await (window as any).electron.ipcRenderer.invoke("get-relay-url");
          if (relayFromFile) break;
          console.log(`⏳ Esperando URL del Host... (intento ${i + 1})`);
          await new Promise(r => setTimeout(r, 500));
        }
        if (relayFromFile) {
          finalRelayIp = relayFromFile;
          setCustomRelay(relayFromFile);
          localStorage.setItem("emu_latam_relay", relayFromFile);
        } else {
          alert("No se encontró la URL del Host. ¿Ejecutaste HOST GAME primero?");
          return;
        }
      }
      setStatusText("Iniciando RetroArch...");
      const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
        useRelay: true, isHost: isHost, relayIp: finalRelayIp, relayUrl: isHost ? finalRelayIp : undefined,
      });
      if (!gameResult || !gameResult.success) alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
      setStatusText("");
    } catch (e) {
      console.error("Error:", e);
      setLoading(p => ({ ...p, bore: false }));
      setStatusText("");
      alert("Error: Asegúrate de tener el emulador configurado.");
    }
  };

  const handleDirectHost = async () => {
    setStatusText("Iniciando RetroArch directo...");
    const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
      useRelay: false, isHost: true,
    });
    if (!gameResult || !gameResult.success) {
      alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
    } else {
      await (window as any).electron.ipcRenderer.invoke("save-relay-url", "127.0.0.1:55435");
    }
    setStatusText("");
  };

  const handleDirectJoin = async () => {
    if (!directHostIp) { alert("Ingresá la IP del host primero"); return; }
    setLoading(p => ({ ...p, directJoin: true }));
    setStatusText("Conectando a host directo...");
    const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
      useRelay: false, isHost: false, directConnectIp: directHostIp,
    });
    if (!gameResult || !gameResult.success) {
      alert("Error al conectar: " + (gameResult?.error || "desconocido"));
    }
    setLoading(p => ({ ...p, directJoin: false }));
    setStatusText("");
  };

  const handleTestMitmLocal = async () => {
    setLoading(p => ({ ...p, mitm: true }));
    setStatusText("Iniciando relay MITM local...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("start-mitm-local");
      if (!result.success) alert("Error MITM local: " + (result.error || "desconocido"));
    } catch (e) {
      console.error("Error MITM:", e);
      alert("Error al iniciar MITM local");
    }
    setLoading(p => ({ ...p, mitm: false }));
    setStatusText("");
  };

  const handleTailscaleHost = async () => {
    setLoading(p => ({ ...p, tsHost: true }));
    setTsStatus("Iniciando host RA...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("tailscale-host");
      if (result.success) {
        setTailscaleHostIp(result.ip);
        setTsStatus(result.message || `Host activo — IP: ${result.ip}`);
      } else {
        alert("Error Tailscale: " + result.error);
        setTsStatus("");
      }
    } catch (e) {
      console.error("Error Tailscale host:", e);
      alert("Error al iniciar host Tailscale");
      setTsStatus("");
    }
    setLoading(p => ({ ...p, tsHost: false }));
  };

  const handleTailscaleGuest = async () => {
    if (!tailscaleHostIp) { alert("Pegá la IP del host en el campo de texto primero"); return; }
    setLoading(p => ({ ...p, tsJoin: true }));
    setTsStatus("Conectando a host via Tailscale...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("tailscale-guest", { hostIp: tailscaleHostIp });
      if (!result.success) {
        alert("Error Tailscale: " + (result.error || "desconocido"));
        setTsStatus("");
      } else {
        setTsStatus("Conectado a host via Tailscale");
      }
    } catch (e) {
      console.error("Error Tailscale guest:", e);
      alert("Error al conectar via Tailscale");
      setTsStatus("");
    }
    setLoading(p => ({ ...p, tsJoin: false }));
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppShell>
        <GameCard>
          <GameTitle>READY TO <span>FIGHT?</span></GameTitle>
          <DebugInfo>EMU LATAM v2.0 — RETROARCH NETPLAY</DebugInfo>

          {!isAuthenticated ? (
            <>
              <InsertCoinButton onClick={handleInsertCoin}>
                INSERT COIN
              </InsertCoinButton>
              <div style={{ marginTop: 12, width: "100%", maxWidth: 400 }}>
                <p style={{ color: "#888", fontFamily: "monospace", fontSize: "0.6rem", marginBottom: 8, textAlign: "center" }}>
                  PC1 (CREAR SALA): dejá 127.0.0.1:7350 → INSERT COIN<br />
                  PC2 (UNIRSE): pegá IP de PC1 → OK → INSERT COIN
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                  <Input $accent={nakamaReady ? "#0f0" : "#666"} type="text" value={nakamaHost} onChange={(e) => setNakamaHost(e.target.value)}
                    placeholder="IP del servidor" style={{ width: 140, fontSize: "0.65rem", padding: "6px 8px" }} />
                  <span style={{ color: "#555", fontFamily: "monospace", fontSize: "0.7rem" }}>:</span>
                  <Input $accent={nakamaReady ? "#0f0" : "#666"} type="text" value={nakamaPort} onChange={(e) => setNakamaPort(e.target.value)}
                    placeholder="7350" style={{ width: 60, fontSize: "0.65rem", padding: "6px 8px" }} />
                  <Btn onClick={handleSaveNakamaServer} $accent="#555" $bg="#222" style={{ width: "auto", padding: "6px 12px", fontSize: "0.55rem" }}>
                    OK
                  </Btn>
                </div>
                <StatusText $color={nakamaReady ? "#0f0" : "#666"} style={{ marginTop: 6, textAlign: "center" }}>
                  {nakamaReady ? `● NAKAMA ONLINE (${nakamaHost}:${nakamaPort})` : "○ NAKAMA OFFLINE"}
                </StatusText>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", marginTop: "10px", width: "100%" }}>
              <p style={{ color: theme.colors.primary, fontFamily: theme.fonts.arcade, fontSize: "0.9rem", marginBottom: "12px" }}>
                {`> ${username} CONECTADO <`}
              </p>

              {isHostingSala && myTailscaleIp && (
                <Section $accent="#0af" style={{ borderStyle: "dashed" }}>
                  <p style={{ color: "#0af", fontFamily: theme.fonts.arcade, fontSize: "0.7rem", marginBottom: 4 }}>
                    SALA CREADA
                  </p>
                  <p style={{ color: "#fff", fontFamily: "monospace", fontSize: "0.9rem", background: "#000", padding: "8px 12px", borderRadius: 4, border: "1px solid #0af", display: "inline-block", marginBottom: 6 }}>
                    {myTailscaleIp}:{nakamaPort}
                  </p>
                  <StatusText $color="#0af" style={{ fontSize: "0.6rem" }}>
                    Pasá esta IP a tu amigo. Debe ponerla en IP DEL SERVIDOR y presionar INSERT COIN
                  </StatusText>
                </Section>
              )}

              {!isHostingSala && (
                <Section $accent="#0a0" style={{ borderStyle: "dashed" }}>
                  <p style={{ color: "#0f0", fontFamily: theme.fonts.arcade, fontSize: "0.7rem", marginBottom: 4 }}>
                    CONECTADO A SALA
                  </p>
                  <StatusText $color="#888" style={{ fontSize: "0.6rem" }}>
                    Servidor: {nakamaHost}:{nakamaPort}
                  </StatusText>
                </Section>
              )}

              {/* ───── MODO DIRECTO (LAN) ───── */}
              <Section $accent="#0a4a2a">
                <SectionHeader $color="#0f0">
                  <Badge $bg="#0f0">LAN</Badge> MODO DIRECTO — SIN RELAY, SOLO RED LOCAL
                </SectionHeader>
                <Btn onClick={handleDirectHost} $accent="#0f0" $bg="#0a2a1a">
                  INICIAR HOST DIRECTO
                </Btn>
                <Input $accent="#0f0" type="text" value={directHostIp} onChange={(e) => setDirectHostIp(e.target.value)} placeholder="IP del host (ej: 192.168.1.100)" style={{ marginTop: 10 }} />
                <Btn onClick={handleDirectJoin} disabled={loading.directJoin || !directHostIp} $loading={loading.directJoin} $accent="#0f0" $bg={loading.directJoin ? "#0f022" : "transparent"} style={{ marginTop: 10 }}>
                  {loading.directJoin ? "CONECTANDO..." : "JOIN DIRECTO"}
                </Btn>
                <StatusText $color="#888">Host → INICIAR HOST | Guest → pegar IP del host y JOIN</StatusText>
              </Section>

              {/* ───── MODO BORE (TÚNEL) ───── */}
              <Section $accent={theme.colors.primary}>
                <SectionHeader $color={theme.colors.primary}>
                  <Badge $bg={theme.colors.primary}>BORE</Badge> MODO TÚNEL — JUEGA CON AMIGOS POR INTERNET
                </SectionHeader>
                <Btn onClick={() => handleTestGame(true)} disabled={loading.bore} $loading={loading.bore} $accent={theme.colors.primary} $bg={loading.bore ? theme.colors.primary + "22" : "transparent"}>
                  {loading.bore ? "CREANDO TÚNEL..." : "1. HOST GAME"}
                </Btn>
                <div style={{ ...inline.flex, marginTop: 10 }}>
                  <Input $accent={theme.colors.primary} type="text" value={customRelay} onChange={(e) => setCustomRelay(e.target.value)} placeholder="URL del túnel (se copia automática)" />
                  <Btn onClick={handleSaveRelay} $accent="#555" $bg="#222" style={{ width: "auto", whiteSpace: "nowrap", fontSize: "0.6rem", padding: "10px 14px" }}>
                    GUARDAR
                  </Btn>
                </div>
                <Btn onClick={() => handleTestGame(false)} $accent={theme.colors.primary} style={{ marginTop: 10 }}>
                  2. JOIN GAME
                </Btn>
                <StatusText $color="#888">Host → 1. HOST GAME | Guest → 2. JOIN GAME</StatusText>
              </Section>

              {/* ───── MODO TAILSCALE (P2P) ───── */}
              <Section $accent="#0af">
                <SectionHeader $color="#0af">
                  <Badge $bg="#0af">P2P</Badge> MODO TAILSCALE — CONEXIÓN DIRECTA SIN TÚNEL
                </SectionHeader>
                <Btn onClick={handleTailscaleHost} disabled={loading.tsHost} $loading={loading.tsHost} $accent="#0af" $bg={loading.tsHost ? "#0af22" : "transparent"}>
                  {loading.tsHost ? "INICIANDO..." : "HOST TAILSCALE"}
                </Btn>
                <Input $accent="#0af" type="text" value={tailscaleHostIp} onChange={(e) => setTailscaleHostIp(e.target.value)} placeholder="IP Tailscale del host (ej: 100.x.x.x)" style={{ marginTop: 10 }} />
                <Btn onClick={handleTailscaleGuest} disabled={loading.tsJoin || !tailscaleHostIp} $loading={loading.tsJoin} $accent="#0af" $bg={loading.tsJoin ? "#0af22" : "transparent"} style={{ marginTop: 10 }}>
                  {loading.tsJoin ? "CONECTANDO..." : "JOIN VÍA TAILSCALE"}
                </Btn>
                {tsStatus && <StatusText $color="#0af">{tsStatus}</StatusText>}
              </Section>

              {/* ───── MODO DEBUG ───── */}
              <Section $accent="#a0a">
                <SectionHeader $color="#a0a">
                  <Badge $bg="#a0a">DBG</Badge> DEBUG — PRUEBAS LOCALES
                </SectionHeader>
                <Btn onClick={handleTestMitmLocal} disabled={loading.mitm} $loading={loading.mitm} $accent="#a0a" $bg={loading.mitm ? "#a0a22" : "transparent"}>
                  {loading.mitm ? "INICIANDO..." : "MITM LOCAL (HOST+GUEST MISMA PC)"}
                </Btn>
              </Section>

              {statusText && <StatusText $color={theme.colors.accent} style={{ textAlign: "center" }}>{statusText}</StatusText>}

              <Divider />
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <StatusText $color={isConnected ? theme.colors.success : theme.colors.danger} style={{ margin: 0, fontSize: "0.55rem" }}>
                  {isConnected ? "● WEBSOCKET CONNECTED" : "○ WEBSOCKET DISCONNECTED"}
                </StatusText>
              </div>
            </div>
          )}
        </GameCard>
      </AppShell>
      <ChallengeModal />
    </ThemeProvider>
  );
}

export default App;
