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
  const [isServerReady, setIsServerReady] = useState(false);
  const [isLaunchingRelay, setIsLaunchingRelay] = useState(false);
  const [customRelay, setCustomRelay] = useState("");
  const [statusText, setStatusText] = useState("");

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:7350");
      setIsServerReady(res.ok);
    } catch {
      setIsServerReady(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const checkLoop = async () => {
      while (active) {
        await checkHealth();
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    checkLoop();
    return () => { active = false; };
  }, [checkHealth]);

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

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppShell>
        <GameCard>
          <GameTitle>READY TO <span>FIGHT?</span></GameTitle>
          <DebugInfo>SISTEMA ACTUALIZADO - VERSIÓN 2.0</DebugInfo>
          {!isAuthenticated ? (
            <InsertCoinButton onClick={handleInsertCoin} disabled={!isServerReady}>
              {isServerReady ? "INSERT COIN" : "INICIANDO SERVIDOR..."}
            </InsertCoinButton>
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
