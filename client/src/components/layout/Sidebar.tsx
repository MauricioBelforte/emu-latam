import React from "react";
import styled from "styled-components";
import { useSocial } from "../../context/SocialContext";
import { useAuth } from "../../context/AuthContext";

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

const UserItem = styled.div<{ $isSelf?: boolean }>`
  font-family: ${(props) => props.theme.fonts.main};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${(props) =>
    props.$isSelf ? props.theme.colors.primary : props.theme.colors.text};
  font-weight: ${(props) => (props.$isSelf ? "bold" : "normal")};

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    background: ${(props) => props.theme.colors.success};
    border-radius: 50%;
    box-shadow: 0 0 5px ${(props) => props.theme.colors.success};
  }
`;

export const Sidebar: React.FC = () => {
  const { onlineUsers } = useSocial();
  const { userId } = useAuth();

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
        onlineUsers.map((user) => (
          <UserItem key={user.session_id} $isSelf={user.user_id === userId}>
            {user.username} {user.user_id === userId && "(TÚ)"}
          </UserItem>
        ))
      )}
    </SidebarContainer>
  );
};
