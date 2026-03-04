import React from "react";
import styled, { keyframes } from "styled-components";

const flicker = keyframes`
  0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
    opacity: 0.99;
    text-shadow: ${(props) => props.theme.shadows.neonPrimary};
  }
  20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
    opacity: 0.4;
    text-shadow: none;
  }
`;

const HeaderContainer = styled.header`
  height: 70px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 2px solid ${(props) => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
  width: 100%;
`;

const Logo = styled.div`
  font-family: ${(props) => props.theme.fonts.arcade};
  font-size: 1.2rem;
  color: ${(props) => props.theme.colors.primary};
  letter-spacing: 2px;
  animation: ${flicker} 3s linear infinite;
`;

const StatusBox = styled.div`
  background: #222;
  padding: 5px 15px;
  border: 1px solid #444;
  border-radius: 4px;
`;

import { useAuth } from "../../context/AuthContext";

export const Header: React.FC = () => {
  const { isConnected, isAuthenticated, username } = useAuth();

  return (
    <HeaderContainer>
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <Logo>KOF LATAM V2</Logo>
      </div>

      <StatusBox>
        <span
          style={{
            color: "#fff",
            fontSize: "0.8rem",
            fontFamily: "Inter",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
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
        </span>
      </StatusBox>
    </HeaderContainer>
  );
};
