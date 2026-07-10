import React from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalBox = styled.div`
  background: linear-gradient(135deg, #0a0a0a 0%, #0a0a1a 100%);
  border: 2px solid ${(p) => p.theme.colors.primary};
  border-radius: 12px;
  padding: 35px;
  min-width: 380px;
  max-width: 440px;
  text-align: center;
  animation: ${slideUp} 0.3s ease-out;
`;

const Title = styled.h2`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.primary};
  font-size: 1rem;
  margin-bottom: 6px;
`;

const SubText = styled.p`
  font-family: ${(p) => p.theme.fonts.main};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 0.8rem;
  margin-bottom: 25px;
`;

const MethodBtn = styled.button<{ $accent: string }>`
  width: 100%;
  padding: 14px 20px;
  margin-bottom: 10px;
  font-size: 0.75rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  letter-spacing: 1px;
  text-transform: uppercase;
  background: transparent;
  color: ${(p) => p.$accent};
  border: 2px solid ${(p) => p.$accent};
  cursor: pointer;
  border-radius: 6px;
  transition: ${(p) => p.theme.transitions.default};

  &:hover {
    background: ${(p) => p.$accent};
    color: #000;
    transform: scale(1.02);
  }
`;

const CancelBtn = styled.button`
  margin-top: 10px;
  padding: 8px 20px;
  font-size: 0.6rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: transparent;
  border: 1px solid #555;
  color: #666;
  cursor: pointer;
  transition: ${(p) => p.theme.transitions.default};

  &:hover {
    border-color: ${(p) => p.theme.colors.danger};
    color: ${(p) => p.theme.colors.danger};
  }
`;

const methods = [
  { key: "tailscale", label: "TAILSCALE (P2P)", accent: "#0af", desc: "Conexión directa, ambos necesitan Tailscale" },
  { key: "bore", label: "BORE (TÚNEL)", accent: "#00f3ff", desc: "Túnel por internet, sin configuración" },
  { key: "lan", label: "LAN DIRECTO", accent: "#0f0", desc: "Solo funciona en la misma red local" },
] as const;

interface MethodPickerProps {
  targetName: string;
  onSelect: (method: string) => void;
  onCancel: () => void;
}

export const MethodPicker: React.FC<MethodPickerProps> = ({ targetName, onSelect, onCancel }) => {
  return (
    <Overlay>
      <ModalBox>
        <Title>ELEGÍ MÉTODO DE CONEXIÓN</Title>
        <SubText>¿Cómo querés conectar con <strong>{targetName}</strong>?</SubText>
        {methods.map((m) => (
          <MethodBtn key={m.key} $accent={m.accent} onClick={() => onSelect(m.key)}>
            {m.label}
            <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 4, fontFamily: "Inter" }}>
              {m.desc}
            </span>
          </MethodBtn>
        ))}
        <CancelBtn onClick={onCancel}>CANCELAR</CancelBtn>
      </ModalBox>
    </Overlay>
  );
};
