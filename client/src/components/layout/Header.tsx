import React from "react";
import styled, { keyframes } from "styled-components";
import { useAuth } from "../../context/AuthContext";

const flicker = keyframes`
  0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 0.99; text-shadow: ${(p) => p.theme.shadows.neonPrimary}; }
  20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.4; text-shadow: none; }
`;

const HeaderContainer = styled.header`
  height: 70px;
  background-color: ${(p) => p.theme.colors.surface};
  border-bottom: 2px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
  width: 100%;
`;

const Logo = styled.div`
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 1.2rem;
  color: ${(p) => p.theme.colors.primary};
  letter-spacing: 2px;
  animation: ${flicker} 3s linear infinite;
`;

const ToggleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ToggleBtn = styled.button<{ $active: boolean; $side: "left" | "right" }>`
  background: ${(p) => (p.$active ? "rgba(255,255,255,0.08)" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? p.theme.colors.primary : "#444")};
  color: ${(p) => (p.$active ? p.theme.colors.primary : "#666")};
  cursor: pointer;
  padding: 6px 12px;
  font-size: 0.6rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  letter-spacing: 1px;
  transition: ${(p) => p.theme.transitions.default};

  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.primary};
  }
`;

const StatusBox = styled.div`
  background: #222;
  padding: 5px 15px;
  border: 1px solid #444;
  border-radius: 4px;
`;

interface HeaderProps {
  sidebarOpen: boolean;
  chatOpen: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  chatOpen,
  onToggleSidebar,
  onToggleChat,
  showBack,
  onBack,
}) => {
  const { isConnected, isAuthenticated, username } = useAuth();

  return (
    <HeaderContainer>
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <Logo>KOF LATAM V2</Logo>
        <ToggleGroup>
          <ToggleBtn $active={sidebarOpen} $side="left" onClick={onToggleSidebar}>
            ☰ PLAYERS
          </ToggleBtn>
          <ToggleBtn $active={chatOpen} $side="right" onClick={onToggleChat}>
            💬 CHAT
          </ToggleBtn>
        </ToggleGroup>
      </div>

      <StatusBox>
        <span style={{ color: "#fff", fontSize: "0.8rem", fontFamily: "Inter", display: "flex", alignItems: "center", gap: "10px" }}>
          {isAuthenticated ? (
            <>
              <span>{username}</span>
              <span style={{ color: isConnected ? "#00ff00" : "#ff0000" }}>
                {isConnected ? "● ONLINE" : "○ OFFLINE"}
              </span>
            </>
          ) : (
            <span>NOT AUTHENTICATED</span>
          )}
          {showBack && onBack && (
            <button onClick={onBack} style={{ background: "#c44", border: "none", color: "#fff", cursor: "pointer", padding: "2px 8px", fontSize: "0.55rem", fontFamily: "Inter", borderRadius: 3 }}>
              ← VOLVER
            </button>
          )}
        </span>
      </StatusBox>
    </HeaderContainer>
  );
};
