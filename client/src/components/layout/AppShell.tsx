import React from "react";
import styled from "styled-components";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ChatBox } from "../ui/ChatBox";

const ShellContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: ${(props) => props.theme.colors.background};
`;

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const SidebarWrapper = styled.div`
  width: 250px;
  flex-shrink: 0;
  border-right: 2px solid ${(props) => props.theme.colors.border};
`;

const ChatWrapper = styled.div`
  width: 320px;
  flex-shrink: 0;
  border-left: 2px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.surface};
`;

const TickerBar = styled.footer`
  height: 34px;
  background-color: #000;
  border-top: 2px solid ${(props) => props.theme.colors.border};
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const TickerText = styled.div`
  white-space: nowrap;
  animation: scroll 40s linear infinite;
  color: ${(props) => props.theme.colors.accent};
  font-family: ${(props) => props.theme.fonts.arcade};
  font-size: 0.65rem;

  @keyframes scroll {
    0% {
      transform: translateX(100vw);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ShellContainer>
      <Header />
      <ContentArea>
        <SidebarWrapper>
          <Sidebar />
        </SidebarWrapper>
        <MainContent>{children}</MainContent>
        <ChatWrapper>
          <ChatBox />
        </ChatWrapper>
      </ContentArea>
      <TickerBar>
        <TickerText>
          - KOF LATAM MVP 1.0 - SERVIDOR ONLINE - CHAT ACTIVO - ¡PREPÁRATE PARA
          LA PELEA!
        </TickerText>
      </TickerBar>
    </ShellContainer>
  );
};
