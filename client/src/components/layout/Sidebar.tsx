import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { useSocial } from "../../context/SocialContext";
import { useAuth } from "../../context/AuthContext";
import { useChallenge } from "../../context/ChallengeContext";

// --- Animaciones ---

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(255, 0, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(255, 0, 255, 0.6); }
`;

// --- Styled Components ---

const SidebarContainer = styled.aside`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 15px;
  background-color: ${(props) => props.theme.colors.surface};
`;

const Title = styled.h3`
  font-family: ${(props) => props.theme.fonts.arcade};
  font-size: 0.7rem;
  color: #666;
  margin-bottom: 20px;
`;

const UserItem = styled.div<{ $isSelf?: boolean; $isSelected?: boolean }>`
  font-family: ${(props) => props.theme.fonts.main};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: ${(props) => (props.$isSelf ? "default" : "pointer")};
  color: ${(props) =>
    props.$isSelf ? props.theme.colors.primary : props.theme.colors.text};
  font-weight: ${(props) => (props.$isSelf ? "bold" : "normal")};
  background: ${(props) =>
    props.$isSelected ? "rgba(255, 0, 255, 0.1)" : "transparent"};
  border: 1px solid
    ${(props) =>
      props.$isSelected ? props.theme.colors.secondary + "44" : "transparent"};
  transition: ${(props) => props.theme.transitions.default};

  &:hover {
    background: ${(props) =>
      props.$isSelf ? "transparent" : "rgba(255, 255, 255, 0.05)"};
  }

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    background: ${(props) => props.theme.colors.success};
    border-radius: 50%;
    box-shadow: 0 0 5px ${(props) => props.theme.colors.success};
  }
`;

const ChallengeButton = styled.button`
  margin-top: 6px;
  margin-bottom: 10px;
  padding: 8px 16px;
  font-size: 0.65rem;
  font-family: ${(props) => props.theme.fonts.arcade};
  background: transparent;
  border: 2px solid ${(props) => props.theme.colors.secondary};
  color: ${(props) => props.theme.colors.secondary};
  cursor: pointer;
  border-radius: 4px;
  width: 100%;
  transition: ${(props) => props.theme.transitions.default};
  animation: ${glowPulse} 2s ease-in-out infinite;
  text-transform: uppercase;

  &:hover {
    background: ${(props) => props.theme.colors.secondary};
    color: #fff;
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    animation: none;
    &:hover {
      background: transparent;
      color: ${(props) => props.theme.colors.secondary};
      transform: none;
    }
  }
`;

const StatusBadge = styled.span`
  font-size: 0.65rem;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-left: auto;
`;

export const Sidebar: React.FC = () => {
  const { onlineUsers } = useSocial();
  const { userId } = useAuth();
  const { sendChallenge, challengeStatus } = useChallenge();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleUserClick = (clickedUserId: string) => {
    if (clickedUserId === userId) return; // No seleccionar a uno mismo
    setSelectedUserId(selectedUserId === clickedUserId ? null : clickedUserId);
  };

  const handleChallenge = (targetUserId: string, targetUsername: string) => {
    sendChallenge(targetUserId, targetUsername);
    setSelectedUserId(null);
  };

  const isBusy = challengeStatus !== "idle";

  return (
    <SidebarContainer>
      <Title>PLAYERS ONLINE ({onlineUsers.length})</Title>
      {onlineUsers.length === 0 ? (
        <span
          style={{ color: "#555", fontSize: "0.8rem", fontFamily: "Inter" }}
        >
          ESPERANDO CONEXIÓN...
        </span>
      ) : (
        onlineUsers.map((user) => {
          const isSelf = user.userId === userId;
          const isSelected = selectedUserId === user.userId;

          return (
            <div key={user.userId}>
              <UserItem
                $isSelf={isSelf}
                $isSelected={isSelected}
                onClick={() => handleUserClick(user.userId)}
              >
                {user.username} {isSelf && "(TÚ)"}
                {!isSelf && <StatusBadge>ONLINE</StatusBadge>}
              </UserItem>

              {/* Mostrar botón de reto si el usuario está seleccionado */}
              {isSelected && !isSelf && (
                <ChallengeButton
                  onClick={() => handleChallenge(user.userId, user.username)}
                  disabled={isBusy}
                >
                  {isBusy ? "RETO EN CURSO..." : "⚔️ RETAR"}
                </ChallengeButton>
              )}
            </div>
          );
        })
      )}
    </SidebarContainer>
  );
};
