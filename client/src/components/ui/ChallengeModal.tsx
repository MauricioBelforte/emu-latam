import React from "react";
import styled, { keyframes } from "styled-components";
import { useChallenge } from "../../context/ChallengeContext";
import { MethodPicker } from "./MethodPicker";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 255, 0.4); }
  50% { box-shadow: 0 0 30px rgba(255, 0, 255, 0.8), 0 0 60px rgba(255, 0, 255, 0.3); }
`;

const countdown = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalBox = styled.div`
  background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%);
  border: 2px solid ${(p) => p.theme.colors.secondary};
  border-radius: 12px;
  padding: 40px;
  min-width: 420px;
  max-width: 500px;
  text-align: center;
  animation: ${slideUp} 0.4s ease-out, ${pulse} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
`;

const TimerBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, ${(p) => p.theme.colors.primary}, ${(p) => p.theme.colors.secondary});
  animation: ${countdown} 30s linear forwards;
`;

const ChallengeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 15px;
`;

const Title = styled.h2`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.secondary};
  font-size: 1.1rem;
  margin-bottom: 10px;
  text-shadow: ${(p) => p.theme.shadows.neonSecondary};
`;

const ChallengerName = styled.p`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.primary};
  font-size: 1.4rem;
  margin-bottom: 5px;
  text-shadow: ${(p) => p.theme.shadows.neonPrimary};
`;

const SubText = styled.p`
  font-family: ${(p) => p.theme.fonts.main};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 0.85rem;
  margin-bottom: 30px;
`;

const MethodBadge = styled.span<{ $accent: string }>`
  display: inline-block;
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: ${(p) => p.$accent}22;
  border: 1px solid ${(p) => p.$accent};
  color: ${(p) => p.$accent};
  margin-bottom: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
`;

const AcceptButton = styled.button`
  padding: 14px 35px;
  font-size: 1rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: transparent;
  border: 3px solid ${(p) => p.theme.colors.success};
  color: ${(p) => p.theme.colors.success};
  cursor: pointer;
  border-radius: 6px;
  transition: ${(p) => p.theme.transitions.default};
  text-transform: uppercase;

  &:hover {
    background: ${(p) => p.theme.colors.success};
    color: #000;
    transform: scale(1.05);
    box-shadow: 0 0 20px ${(p) => p.theme.colors.success};
  }
`;

const RejectButton = styled.button`
  padding: 14px 35px;
  font-size: 1rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: transparent;
  border: 3px solid ${(p) => p.theme.colors.danger};
  color: ${(p) => p.theme.colors.danger};
  cursor: pointer;
  border-radius: 6px;
  transition: ${(p) => p.theme.transitions.default};
  text-transform: uppercase;

  &:hover {
    background: ${(p) => p.theme.colors.danger};
    color: #fff;
    transform: scale(1.05);
    box-shadow: 0 0 20px ${(p) => p.theme.colors.danger};
  }
`;

const StatusText = styled.p<{ $color?: string }>`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.$color || p.theme.colors.accent};
  font-size: 1rem;
  margin-top: 10px;
  text-shadow: 0 0 10px ${(p) => p.$color || p.theme.colors.accent};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary || "#888"};
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  line-height: 1;
  &:hover { color: #fff; }
`;

const METHOD_META: Record<string, { label: string; accent: string }> = {
  tailscale: { label: "Tailscale (P2P)", accent: "#0af" },
  bore: { label: "Bore (Tnnel)", accent: "#00f3ff" },
  lan: { label: "LAN Directo", accent: "#0f0" },
};

export const ChallengeModal: React.FC = () => {
  const { challengeStatus, currentChallenge, pendingTarget, selectMethod, cancelMethodPicker, acceptChallenge, rejectChallenge, cancelChallenge, resetChallenge } = useChallenge();

  if (challengeStatus === "idle" || !currentChallenge && challengeStatus !== "picking_method") return null;

  if (challengeStatus === "picking_method" && pendingTarget) {
    return <MethodPicker targetName={pendingTarget.username} onSelect={selectMethod} onCancel={cancelMethodPicker} />;
  }

  if (!currentChallenge) return null;

  const methodMeta = METHOD_META[currentChallenge.method || "bore"];

  if (challengeStatus === "received") {
    return (
      <Overlay>
        <ModalBox>
          <TimerBar />
          <ChallengeIcon>⚔️</ChallengeIcon>
          <Title>RETO RECIBIDO!</Title>
          <ChallengerName>{currentChallenge.challengerName}</ChallengerName>
          <SubText>quiere pelear contra vos en KOF '98</SubText>
          <MethodBadge $accent={methodMeta.accent}>{methodMeta.label}</MethodBadge>
          <ButtonRow>
            <AcceptButton onClick={acceptChallenge}>ACEPTAR</AcceptButton>
            <RejectButton onClick={rejectChallenge}>RECHAZAR</RejectButton>
          </ButtonRow>
        </ModalBox>
      </Overlay>
    );
  }

  if (challengeStatus === "sent") {
    return (
      <Overlay>
        <ModalBox>
          <TimerBar />
          <ChallengeIcon>🕐</ChallengeIcon>
          <Title>ESPERANDO RESPUESTA...</Title>
          <ChallengerName>{currentChallenge.targetName}</ChallengerName>
          <MethodBadge $accent={methodMeta.accent}>{methodMeta.label}</MethodBadge>
          <SubText>Tiene 30 segundos para responder</SubText>
          <ButtonRow>
            <RejectButton onClick={cancelChallenge}>CANCELAR</RejectButton>
          </ButtonRow>
        </ModalBox>
      </Overlay>
    );
  }

  if (challengeStatus === "accepted") {
    return (
      <Overlay>
        <ModalBox>
          <CloseButton onClick={resetChallenge}>&times;</CloseButton>
          <ChallengeIcon>🔥</ChallengeIcon>
          <Title>PELEA!</Title>
          <StatusText $color="#00ff66">CARGANDO KOF '98...</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  if (challengeStatus === "rejected") {
    return (
      <Overlay>
        <ModalBox>
          <CloseButton onClick={resetChallenge}>&times;</CloseButton>
          <ChallengeIcon>🚫</ChallengeIcon>
          <Title>RETO RECHAZADO</Title>
          <StatusText $color="#ff0033">Mejor suerte la próxima...</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  if (challengeStatus === "timeout") {
    return (
      <Overlay>
        <ModalBox>
          <CloseButton onClick={resetChallenge}>&times;</CloseButton>
          <ChallengeIcon>⏰</ChallengeIcon>
          <Title>TIEMPO AGOTADO</Title>
          <StatusText $color="#ffea00">El reto ha expirado</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  return null;
};
