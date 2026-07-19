import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ChatBox } from "../ui/ChatBox";

const ShellContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: ${(p) => p.theme.colors.background};
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
  min-width: 0;
`;

const Pane = styled.div<{ $open: boolean; $width: number }>`
  width: ${(p) => (p.$open ? p.$width : 0)}px;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.25s ease;
  ${(p) => p.$open ? "" : "border: none !important;"}
`;

const SidebarInner = styled.div`
  width: 250px;
  height: 100%;
  border-right: 2px solid ${(p) => p.theme.colors.border};
`;

const ChatInner = styled.div`
  width: 320px;
  height: 100%;
  border-left: 2px solid ${(p) => p.theme.colors.border};
  background-color: ${(p) => p.theme.colors.surface};
`;

const TickerBar = styled.footer`
  height: 34px;
  background-color: #000;
  border-top: 2px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const TickerText = styled.div`
  white-space: nowrap;
  animation: scroll 40s linear infinite;
  color: ${(p) => p.theme.colors.accent};
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.65rem;

  @keyframes scroll {
    0% { transform: translateX(100vw); }
    100% { transform: translateX(-100%); }
  }
`;

interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  showPlayers?: boolean;
  showNetplayConfig?: boolean;
  onToggleNetplayConfig?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, showBack, onBack, showPlayers, showNetplayConfig, onToggleNetplayConfig }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 1100) setSidebarOpen(false);
      if (w < 800) setChatOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <ShellContainer>
      <Header
        sidebarOpen={sidebarOpen}
        chatOpen={chatOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onToggleChat={() => setChatOpen((o) => !o)}
        showBack={showBack}
        onBack={onBack}
        showNetplayConfig={showNetplayConfig}
        onToggleNetplayConfig={onToggleNetplayConfig}
      />
      <ContentArea>
        <Pane $open={sidebarOpen} $width={250}>
          <SidebarInner>
            <Sidebar showPlayers={showPlayers} />
          </SidebarInner>
        </Pane>
        <MainContent>{children}</MainContent>
        <Pane $open={chatOpen} $width={320}>
          <ChatInner>
            <ChatBox />
          </ChatInner>
        </Pane>
      </ContentArea>
      <TickerBar>
        <TickerText>
          - KOF LATAM V2 - SERVIDOR ONLINE - CHAT ACTIVO - ¡PREPÁRATE PARA LA PELEA!
        </TickerText>
      </TickerBar>
    </ShellContainer>
  );
};
