import React from "react";
import styled, { ThemeProvider } from "styled-components";
import { useAuth } from "./context/AuthContext";
import { theme } from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppShell } from "./components/layout/AppShell";

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

  const handleInsertCoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("INSERT COIN CLICKED");
    await loginGhost();
  };

  const handleTestGame = async () => {
    try {
      // @ts-ignore - window.electron comes from preload
      await window.electron.ipcRenderer.invoke("launch-game", { rom: "kof98" });
    } catch (e) {
      console.error("Error al lanzar el juego:", e);
      alert("Error: Asegúrate de tener fbneo.exe en la carpeta emulator/");
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
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <p
                style={{
                  color: theme.colors.primary,
                  fontFamily: theme.fonts.arcade,
                  fontSize: "1.2rem",
                  marginBottom: "15px",
                }}
              >
                WELCOME, {username}
              </p>

              <InsertCoinButton
                onClick={handleTestGame}
                style={{
                  padding: "15px 40px",
                  fontSize: "1.2rem",
                  marginBottom: "15px",
                }}
              >
                TEST EMULATOR
              </InsertCoinButton>

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
    </ThemeProvider>
  );
}

export default App;
