import React from "react";
import styled, { ThemeProvider } from "styled-components";
import { useAuth } from "./context/AuthContext";
import { theme } from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppShell } from "./components/layout/AppShell";
import { ChallengeModal } from "./components/ui/ChallengeModal";

const GameCard = styled.div`
  background: linear-gradient(
    135deg,
    ${(props) => props.theme.colors.surface} 0%,
    ${(props) => props.theme.colors.background} 100%
  );
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

  span {
    color: ${(props) => props.theme.colors.primary};
    text-shadow: ${(props) => props.theme.shadows.neonPrimary};
  }
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
  border: 4px solid ${(props) => props.theme.colors.secondary};
  color: ${(props) => props.theme.colors.secondary};
  cursor: pointer;
  box-shadow: ${(props) => props.theme.shadows.neonSecondary};
  transition: ${(props) => props.theme.transitions.default};
  font-family: ${(props) => props.theme.fonts.arcade};

  &:hover {
    background-color: ${(props) => props.theme.colors.secondary};
    color: #fff;
    transform: scale(1.05);
  }
`;

function App() {
  const { isAuthenticated, isConnected, loginGhost, username } = useAuth();
  const [customRelay, setCustomRelay] = React.useState(
    localStorage.getItem("emu_latam_relay") || "bore.pub:18863",
  );
  const [isLaunchingRelay, setIsLaunchingRelay] = React.useState(false);

  const handleSaveRelay = () => {
    localStorage.setItem("emu_latam_relay", customRelay);
    alert("Configuración de Relay guardada!");
  };

  const handleInsertCoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("INSERT COIN CLICKED");
    await loginGhost();
  };

  const handleTestGame = async (isHost: boolean) => {
    let finalRelayIp = customRelay;

    try {
      if (isHost) {
        setIsLaunchingRelay(true);
        console.log("🛠️ Solicitando Túnel Automático...");
        // @ts-ignore
        const result = await window.electron.ipcRenderer.invoke("start-relay-tunnel");
        
        if (result.success) {
          console.log("✅ Túnel obtenido:", result.url);
          finalRelayIp = result.url;
          setCustomRelay(result.url);
          localStorage.setItem("emu_latam_relay", result.url);
        } else {
          console.error("❌ Error en túnel:", result.error);
          alert("Error al iniciar túnel: " + result.error);
          setIsLaunchingRelay(false);
          return;
        }
        setIsLaunchingRelay(false);
      }

      // @ts-ignore - window.electron comes from preload
      await window.electron.ipcRenderer.invoke("launch-game", {
        rom: "kof98",
        useRelay: true,
        isHost: isHost,
        relayIp: finalRelayIp,
        relaySessionId: "test-session-" + Date.now(),
      });
    } catch (e) {
      console.error("Error al lanzar el juego:", e);
      setIsLaunchingRelay(false);
      alert("Error: Asegúrate de tener el emulador configurado.");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppShell>
        <GameCard>
          <GameTitle>
            READY TO <span>FIGHT?</span>
          </GameTitle>
          <DebugInfo>SISTEMA ACTUALIZADO - VERSIÓN 2.0</DebugInfo>

          {!isAuthenticated ? (
            <InsertCoinButton onClick={handleInsertCoin}>
              INSERT COIN
            </InsertCoinButton>
          ) : (
            <div
              style={{ textAlign: "center", marginTop: "10px", width: "100%" }}
            >
              <p
                style={{
                  color: theme.colors.primary,
                  fontFamily: theme.fonts.arcade,
                  fontSize: "1.2rem",
                  marginBottom: "20px",
                }}
              >
                WELCOME, {username}
              </p>

              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "25px",
                  border: "1px solid #333",
                }}
              >
                <p
                  style={{
                    color: "#aaa",
                    fontSize: "0.7rem",
                    marginBottom: "10px",
                    textAlign: "left",
                    fontFamily: "monospace",
                  }}
                >
                  CONFIGURACIÓN DE RELAY (V2):
                </p>
                <input
                  type="text"
                  value={customRelay}
                  onChange={(e) => setCustomRelay(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#000",
                    border: "1px solid #555",
                    color: "#0f0",
                    fontFamily: "monospace",
                    marginBottom: "10px",
                  }}
                  placeholder="ej: mi-relay.playit.gg:23065"
                />
                <button
                  onClick={handleSaveRelay}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#333",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  GUARDAR CONFIGURACIÓN
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <InsertCoinButton
                  onClick={() => handleTestGame(true)}
                  disabled={isLaunchingRelay}
                  style={{
                    padding: "15px 10px",
                    fontSize: "0.9rem",
                    opacity: isLaunchingRelay ? 0.5 : 1,
                    position: "relative"
                  }}
                >
                  {isLaunchingRelay ? "CREANDO TÚNEL..." : "1. HOST GAME"}
                </InsertCoinButton>
                <InsertCoinButton
                  onClick={() => handleTestGame(false)}
                  style={{
                    padding: "15px 10px",
                    fontSize: "0.9rem",
                  }}
                >
                  2. JOIN GAME
                </InsertCoinButton>
              </div>

              <p
                style={{
                  color: isConnected
                    ? theme.colors.success
                    : theme.colors.danger,
                  fontFamily: theme.fonts.main,
                  fontSize: "0.8rem",
                }}
              >
                {isConnected
                  ? "● WEBSOCKET CONNECTED"
                  : "○ WEBSOCKET DISCONNECTED"}
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
