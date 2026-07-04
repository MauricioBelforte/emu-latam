import React, { useState, useEffect, useCallback } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useAuth } from "./context/AuthContext";
import { theme } from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppShell } from "./components/layout/AppShell";
import { ChallengeModal } from "./components/ui/ChallengeModal";

const GameCard = styled.div`
  background: linear-gradient(135deg, ${(props) => props.theme.colors.surface} 0%, ${(props) => props.theme.colors.background} 100%);
  border: 2px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  padding: 40px;
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  margin: auto;
`;

const GameTitle = styled.h2`
  font-size: 3rem;
  margin-bottom: 10px;
  text-align: center;
  color: #fff;
  font-family: ${(props) => props.theme.fonts.arcade};
  span { color: ${(props) => props.theme.colors.primary}; text-shadow: ${(props) => props.theme.shadows.neonPrimary}; }
`;

const DebugInfo = styled.p`
  color: ${(props) => props.theme.colors.accent};
  font-family: ${(props) => props.theme.fonts.arcade};
  font-size: 0.8rem;
  margin-bottom: 30px;
`;

const InsertCoinButton = styled.button`
  padding: 25px 60px;
  font-size: 1.8rem;
  background-color: transparent;
  border: 3px solid ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.primary};
  font-family: ${(props) => props.theme.fonts.arcade};
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 3px;

  &:hover:not(:disabled) {
    background-color: ${(props) => props.theme.colors.primary};
    color: #000;
    box-shadow: ${(props) => props.theme.shadows.neonPrimary};
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

function App() {
  const { loginGhost, isAuthenticated, username, isConnected } = useAuth();
  const [isLaunchingRelay, setIsLaunchingRelay] = useState(false);
  const [isLaunchingMitm, setIsLaunchingMitm] = useState(false);
  const [isHostingTailscale, setIsHostingTailscale] = useState(false);
  const [isJoiningTailscale, setIsJoiningTailscale] = useState(false);
  const [tailscaleHostIp, setTailscaleHostIp] = useState("");
  const [tsStatus, setTsStatus] = useState("");
  const [customRelay, setCustomRelay] = useState("");
  const [statusText, setStatusText] = useState("");

  const [nakamaReady, setNakamaReady] = useState(false);

  useEffect(() => {
    let active = true;
    const checkLoop = async () => {
      while (active) {
        try {
          const res = await fetch("http://localhost:7350");
          if (active) setNakamaReady(res.ok);
        } catch {
          if (active) setNakamaReady(false);
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    };
    checkLoop();
    return () => { active = false; };
  }, []);

  const handleSaveRelay = () => {
    localStorage.setItem("emu_latam_relay", customRelay);
    alert("Configuración de Relay guardada!");
  };

  const handleInsertCoin = async () => {
    console.log("INSERT COIN CLICKED");
    await loginGhost();
  };

  const handleTestGame = async (isHost: boolean) => {
    let finalRelayIp = customRelay;
    try {
      if (isHost) {
        setIsLaunchingRelay(true);
        setStatusText("Iniciando relay...");
        const result = await (window as any).electron.ipcRenderer.invoke("start-relay-tunnel");
        if (result.success) {
          finalRelayIp = result.url;
          setCustomRelay(result.url);
          localStorage.setItem("emu_latam_relay", result.url);
          await (window as any).electron.ipcRenderer.invoke("save-relay-url", result.url);
        } else {
          alert("Error al iniciar túnel: " + result.error);
          setIsLaunchingRelay(false);
          return;
        }
        setIsLaunchingRelay(false);
      } else {
        let relayFromFile = null;
        for (let i = 0; i < 20; i++) {
          relayFromFile = await (window as any).electron.ipcRenderer.invoke("get-relay-url");
          if (relayFromFile) break;
          console.log(`⏳ Esperando URL del Host... (intento ${i + 1})`);
          await new Promise(r => setTimeout(r, 500));
        }
        console.log("📄 Relay URL desde archivo:", relayFromFile);
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
        useRelay: true,
        isHost: isHost,
        relayIp: finalRelayIp,
        relayUrl: isHost ? finalRelayIp : undefined,
      });
      console.log("🎮 Resultado launch-game:", gameResult);
      if (!gameResult || !gameResult.success) alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
      setStatusText("");
    } catch (e) {
      console.error("Error:", e);
      setIsLaunchingRelay(false);
      setStatusText("");
      alert("Error: Asegúrate de tener el emulador configurado.");
    }
  };

  const handleDirectHost = async () => {
    setStatusText("Iniciando RetroArch directo...");
    const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
      useRelay: false,
      isHost: true,
    });
    console.log("🎮 Resultado launch-game directo:", gameResult);
    if (!gameResult || !gameResult.success) {
      alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
    } else {
      await (window as any).electron.ipcRenderer.invoke("save-relay-url", "127.0.0.1:55435");
      console.log("✅ URL directa guardada en archivo");
    }
    setStatusText("");
  };

  const handleTestMitmLocal = async () => {
    setIsLaunchingMitm(true);
    setStatusText("Iniciando relay MITM local...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("start-mitm-local");
      if (!result.success) {
        alert("Error MITM local: " + (result.error || "desconocido"));
      }
    } catch (e) {
      console.error("Error MITM:", e);
      alert("Error al iniciar MITM local");
    }
    setIsLaunchingMitm(false);
    setStatusText("");
  };

  const handleTailscaleHost = async () => {
    setIsHostingTailscale(true);
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
    setIsHostingTailscale(false);
  };

  const handleTailscaleGuest = async () => {
    if (!tailscaleHostIp) {
      alert("Pegá la IP del host en el campo de texto primero");
      return;
    }
    setIsJoiningTailscale(true);
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
    setIsJoiningTailscale(false);
  };

  const handleStopTailscale = async () => {
    await (window as any).electron.ipcRenderer.invoke("stop-tailscale");
    setTailscaleHostIp("");
    setTsStatus("");
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppShell>
        <GameCard>
          <GameTitle>READY TO <span>FIGHT?</span></GameTitle>
          <DebugInfo>SISTEMA ACTUALIZADO - VERSIÓN 2.0</DebugInfo>
          {!isAuthenticated ? (
            <InsertCoinButton onClick={handleInsertCoin}>
              INSERT COIN
            </InsertCoinButton>
            <p style={{ color: nakamaReady ? "#0f0" : "#666", fontFamily: "monospace", fontSize: "0.6rem", marginTop: "6px" }}>
              {nakamaReady ? "● NAKAMA ONLINE" : "○ NAKAMA OFFLINE"}
            </p>
          ) : (
            <div style={{ textAlign: "center", marginTop: "10px", width: "100%" }}>
              <p style={{ color: theme.colors.primary, fontFamily: theme.fonts.arcade, fontSize: "1.2rem", marginBottom: "20px" }}>
                WELCOME, {username}
              </p>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #333" }}>
                <p style={{ color: "#aaa", fontSize: "0.7rem", marginBottom: "10px", textAlign: "left", fontFamily: "monospace" }}>
                  CONFIGURACIÓN DE RELAY (V2):
                </p>
                <input type="text" value={customRelay} onChange={(e) => setCustomRelay(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "#000", border: "1px solid #555", color: "#0f0", fontFamily: "monospace", marginBottom: "10px" }}
                  placeholder="ej: mi-relay.playit.gg:23065" />
                <button onClick={handleSaveRelay} style={{ width: "100%", padding: "8px", background: "#333", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>
                  GUARDAR CONFIGURACIÓN
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <InsertCoinButton onClick={() => handleTestGame(true)} disabled={isLaunchingRelay}
                  style={{ padding: "15px 10px", fontSize: "0.9rem", opacity: isLaunchingRelay ? 0.5 : 1, position: "relative" }}>
                  {isLaunchingRelay ? "CREANDO TÚNEL..." : "1. HOST GAME (BORE)"}
                </InsertCoinButton>
                <InsertCoinButton onClick={() => handleTestGame(false)} style={{ padding: "15px 10px", fontSize: "0.9rem" }}>
                  2. JOIN GAME
                </InsertCoinButton>
              </div>
              <InsertCoinButton onClick={handleDirectHost} style={{ padding: "10px 20px", fontSize: "0.75rem", backgroundColor: "#1a4a1a", marginBottom: "10px" }}>
                HOST DIRECTO (sin bore)
              </InsertCoinButton>
              <InsertCoinButton onClick={handleTestMitmLocal} disabled={isLaunchingMitm}
                style={{ padding: "10px 20px", fontSize: "0.75rem", backgroundColor: "#4a1a4a", opacity: isLaunchingMitm ? 0.5 : 1 }}>
                {isLaunchingMitm ? "INICIANDO RELAY..." : "TEST MITM LOCAL"}
              </InsertCoinButton>
              <div style={{ marginTop: "25px", borderTop: "1px solid #333", paddingTop: "20px" }}>
                <p style={{ color: "#0af", fontSize: "0.7rem", marginBottom: "10px", fontFamily: "monospace" }}>
                  ─── TAILSCALE (P2P DIRECTO) ───
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <InsertCoinButton onClick={handleTailscaleHost} disabled={isHostingTailscale}
                    style={{ padding: "10px 10px", fontSize: "0.75rem", backgroundColor: "#0a3a5a", opacity: isHostingTailscale ? 0.5 : 1 }}>
                    {isHostingTailscale ? "DETECTANDO..." : "HOST TAILSCALE"}
                  </InsertCoinButton>
                  <InsertCoinButton onClick={handleStopTailscale}
                    style={{ padding: "10px 10px", fontSize: "0.75rem", backgroundColor: "#5a1a1a" }}>
                    DETENER TAILSCALE
                  </InsertCoinButton>
                </div>
                <input type="text" value={tailscaleHostIp} onChange={(e) => setTailscaleHostIp(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "#000", border: "1px solid #0af", color: "#0af", fontFamily: "monospace", marginBottom: "10px" }}
                  placeholder="Pegá acá la IP Tailscale del host (ej: 100.85.42.13)" />
                <InsertCoinButton onClick={handleTailscaleGuest} disabled={isJoiningTailscale || !tailscaleHostIp}
                  style={{ padding: "10px 20px", fontSize: "0.75rem", backgroundColor: "#0a5a3a", width: "100%", opacity: isJoiningTailscale ? 0.5 : 1 }}>
                  {isJoiningTailscale ? "CONECTANDO..." : "JOIN VÍA TAILSCALE"}
                </InsertCoinButton>
                {tsStatus && <p style={{ color: "#0af", fontFamily: "monospace", fontSize: "0.75rem", marginTop: "8px" }}>{tsStatus}</p>}
              </div>
              {statusText && <p style={{ color: "#ff0", fontFamily: "monospace", fontSize: "0.8rem", marginTop: "10px" }}>{statusText}</p>}
              <p style={{ color: isConnected ? theme.colors.success : theme.colors.danger, fontFamily: theme.fonts.main, fontSize: "0.8rem" }}>
                {isConnected ? "● WEBSOCKET CONNECTED" : "○ WEBSOCKET DISCONNECTED"}
              </p>
            </div>
          )}
        </GameCard>
      </AppShell>
      <ChallengeModal />
    </ThemeProvider>
  );
}

export default App;
