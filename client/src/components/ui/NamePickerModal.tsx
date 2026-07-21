import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; } to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center; justify-content: center;
  z-index: 2000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalBox = styled.div`
  background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%);
  border: 2px solid ${(p) => p.theme.colors.primary};
  border-radius: 12px;
  padding: 40px;
  min-width: 360px;
  max-width: 420px;
  text-align: center;
  animation: ${slideUp} 0.4s ease-out;
`;

const Title = styled.h2`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.primary};
  font-size: 1.1rem;
  margin: 0 0 8px 0;
  text-shadow: ${(p) => p.theme.shadows.neonPrimary};
`;

const SubText = styled.p`
  font-family: ${(p) => p.theme.fonts.main};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 0.85rem;
  margin-bottom: 24px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  font-size: 1rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: #111;
  border: 2px solid ${(p) => p.theme.colors.primary};
  border-radius: 8px;
  color: #fff;
  text-align: center;
  outline: none;
  box-sizing: border-box;
  &::placeholder { color: #555; }
  &:focus { box-shadow: 0 0 15px ${(p) => p.theme.colors.primary}44; }
`;

const ConfirmButton = styled.button<{ $disabled: boolean }>`
  margin-top: 20px;
  padding: 12px 30px;
  font-size: 0.85rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  background: ${(p) => (p.$disabled ? "#333" : "transparent")};
  border: 2px solid ${(p) => (p.$disabled ? "#555" : p.theme.colors.primary)};
  color: ${(p) => (p.$disabled ? "#555" : p.theme.colors.primary)};
  border-radius: 8px;
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  width: 100%;
  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.primary};
    color: #000;
    box-shadow: 0 0 20px ${(p) => p.theme.colors.primary};
  }
`;

const ErrorText = styled.p`
  color: #f44;
  font-size: 0.7rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  margin-top: 8px;
`;

interface NamePickerModalProps {
  onConfirm: (name: string) => void;
}

export const NamePickerModal: React.FC<NamePickerModalProps> = ({ onConfirm }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const trimmed = name.trim();

  const handleConfirm = () => {
    if (trimmed.length < 3) {
      setError("Mínimo 3 caracteres");
      return;
    }
    if (trimmed.length > 20) {
      setError("Máximo 20 caracteres");
      return;
    }
    if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(trimmed)) {
      setError("Solo letras y espacios");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Overlay>
      <ModalBox>
        <Title>👾 BIENVENIDO</Title>
        <SubText>Elegí tu nombre de jugador</SubText>
        <Input
          autoFocus
          placeholder="Ej: Pepe"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          maxLength={20}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <ConfirmButton $disabled={trimmed.length < 3} onClick={handleConfirm}>
          EMPEZAR
        </ConfirmButton>
      </ModalBox>
    </Overlay>
  );
};
