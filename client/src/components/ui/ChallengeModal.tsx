import React from "react";
import styled, { keyframes } from "styled-components";
import { useChallenge } from "../../context/ChallengeContext";

// --- Animaciones ---

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

// --- Styled Components ---

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
  border: 2px solid ${(props) => props.theme.colors.secondary};
  border-radius: 12px;
  padding: 40px;
  min-width: 420px;
  max-width: 500px;
  text-align: center;
  animation:
    ${slideUp} 0.4s ease-out,
    ${pulse} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
`;

const TimerBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.primary},
    ${(props) => props.theme.colors.secondary}
  );
  animation: ${countdown} 30s linear forwards;
`;

const ChallengeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 15px;
`;

const Title = styled.h2`
  font-family: ${(props) => props.theme.fonts.arcade};
  color: ${(props) => props.theme.colors.secondary};
  font-size: 1.1rem;
  margin-bottom: 10px;
  text-shadow: ${(props) => props.theme.shadows.neonSecondary};
`;

const ChallengerName = styled.p`
  font-family: ${(props) => props.theme.fonts.arcade};
  color: ${(props) => props.theme.colors.primary};
  font-size: 1.4rem;
  margin-bottom: 5px;
  text-shadow: ${(props) => props.theme.shadows.neonPrimary};
`;

const SubText = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 0.85rem;
  margin-bottom: 30px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
`;

const AcceptButton = styled.button`
  padding: 14px 35px;
  font-size: 1rem;
  font-family: ${(props) => props.theme.fonts.arcade};
  background: transparent;
  border: 3px solid ${(props) => props.theme.colors.success};
  color: ${(props) => props.theme.colors.success};
  cursor: pointer;
  border-radius: 6px;
  transition: ${(props) => props.theme.transitions.default};
  text-transform: uppercase;

  &:hover {
    background: ${(props) => props.theme.colors.success};
    color: #000;
    transform: scale(1.05);
    box-shadow: 0 0 20px ${(props) => props.theme.colors.success};
  }
`;

const RejectButton = styled.button`
  padding: 14px 35px;
  font-size: 1rem;
  font-family: ${(props) => props.theme.fonts.arcade};
  background: transparent;
  border: 3px solid ${(props) => props.theme.colors.danger};
  color: ${(props) => props.theme.colors.danger};
  cursor: pointer;
  border-radius: 6px;
  transition: ${(props) => props.theme.transitions.default};
  text-transform: uppercase;

  &:hover {
    background: ${(props) => props.theme.colors.danger};
    color: #fff;
    transform: scale(1.05);
    box-shadow: 0 0 20px ${(props) => props.theme.colors.danger};
  }
`;

const StatusText = styled.p<{ $color?: string }>`
  font-family: ${(props) => props.theme.fonts.arcade};
  color: ${(props) => props.$color || props.theme.colors.accent};
  font-size: 1rem;
  margin-top: 10px;
  text-shadow: 0 0 10px ${(props) => props.$color || props.theme.colors.accent};
`;

// --- Componente ---

export const ChallengeModal: React.FC = () => {
  const {
    challengeStatus,
    currentChallenge,
    acceptChallenge,
    rejectChallenge,
    cancelChallenge,
  } = useChallenge();

  // No mostrar nada si estamos en idle
  if (challengeStatus === "idle" || !currentChallenge) return null;

  // Modal: Reto recibido (Soy el retado)
  if (challengeStatus === "received") {
    return (
      <Overlay>
        <ModalBox>
          <TimerBar />
          <ChallengeIcon>⚔️</ChallengeIcon>
          <Title>¡RETO RECIBIDO!</Title>
          <ChallengerName>{currentChallenge.challengerName}</ChallengerName>
          <SubText>quiere pelear contra vos en KOF '98</SubText>
          <ButtonRow>
            <AcceptButton onClick={acceptChallenge}>ACEPTAR</AcceptButton>
            <RejectButton onClick={rejectChallenge}>RECHAZAR</RejectButton>
          </ButtonRow>
        </ModalBox>
      </Overlay>
    );
  }

  // Modal: Reto enviado (Soy el retador, esperando respuesta)
  if (challengeStatus === "sent") {
    return (
      <Overlay>
        <ModalBox>
          <TimerBar />
          <ChallengeIcon>🕐</ChallengeIcon>
          <Title>ESPERANDO RESPUESTA...</Title>
          <ChallengerName>{currentChallenge.targetName}</ChallengerName>
          <SubText>Tiene 30 segundos para responder</SubText>
          <ButtonRow>
            <RejectButton onClick={cancelChallenge}>CANCELAR</RejectButton>
          </ButtonRow>
        </ModalBox>
      </Overlay>
    );
  }

  // Modal: Reto aceptado
  if (challengeStatus === "accepted") {
    return (
      <Overlay>
        <ModalBox>
          <ChallengeIcon>🔥</ChallengeIcon>
          <Title>¡PELEA!</Title>
          <StatusText $color="#00ff66">CARGANDO KOF '98...</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  // Modal: Reto rechazado
  if (challengeStatus === "rejected") {
    return (
      <Overlay>
        <ModalBox>
          <ChallengeIcon>🚫</ChallengeIcon>
          <Title>RETO RECHAZADO</Title>
          <StatusText $color="#ff0033">Mejor suerte la próxima...</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  // Modal: Timeout
  if (challengeStatus === "timeout") {
    return (
      <Overlay>
        <ModalBox>
          <ChallengeIcon>⏰</ChallengeIcon>
          <Title>TIEMPO AGOTADO</Title>
          <StatusText $color="#ffea00">El reto ha expirado</StatusText>
        </ModalBox>
      </Overlay>
    );
  }

  return null;
};
