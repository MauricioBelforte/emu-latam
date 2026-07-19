import React, { useEffect, useState } from "react";
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
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalBox = styled.div`
  background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%);
  border: 2px solid ${(p) => p.theme.colors.primary};
  border-radius: 12px;
  padding: 30px;
  min-width: 420px;
  max-width: 480px;
  animation: ${slideUp} 0.4s ease-out;
  position: relative;
`;

const Title = styled.h2`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.primary};
  font-size: 1rem;
  margin: 0 0 20px 0;
  text-align: center;
  text-shadow: ${(p) => p.theme.shadows.neonPrimary};
`;

const FieldGroup = styled.div`
  margin-bottom: 18px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const TooltipLabel = styled.label`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.textSecondary || "#ccc"};
  font-size: 0.7rem;
  text-transform: uppercase;
  position: relative;
  cursor: help;

  &::after {
    content: attr(data-tip);
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 6px;
    background: #111;
    color: #0ff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 0.6rem;
    font-family: Inter, sans-serif;
    font-weight: 400;
    text-transform: none;
    white-space: normal;
    line-height: 1.4;
    max-width: 380px;
    width: max-content;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.25s ease;
    transition-delay: 0s;
    pointer-events: none;
    border: 1px solid #0ff;
    z-index: 30;
  }

  &::before {
    content: "";
    position: absolute;
    top: 100%;
    left: 12px;
    margin-top: -2px;
    width: 8px;
    height: 8px;
    background: #111;
    border-left: 1px solid #0ff;
    border-top: 1px solid #0ff;
    transform: rotate(45deg);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.25s ease;
    transition-delay: 0s;
    pointer-events: none;
    z-index: 30;
  }

  &:hover::after,
  &:hover::before {
    opacity: 1;
    visibility: visible;
    transition-delay: 1s;
  }
`;

const ValueDisplay = styled.span`
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => p.theme.colors.secondary};
  font-size: 0.9rem;
  text-shadow: ${(p) => p.theme.shadows.neonSecondary};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IncButton = styled.button`
  background: ${(p) => p.theme.colors.surface || "#222"};
  border: 1px solid ${(p) => p.theme.colors.primary};
  color: ${(p) => p.theme.colors.primary};
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover { background: ${(p) => p.theme.colors.primary}; color: #000; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const SegmentedControl = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const SegButton = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? p.theme.colors.primary : "transparent")};
  color: ${(p) => (p.$active ? "#000" : p.theme.colors.primary)};
  border: 1px solid ${(p) => p.theme.colors.primary};
  padding: 4px 10px;
  border-radius: 4px;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.65rem;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: ${(p) => p.theme.colors.primary}; color: #000; }
`;

const ToggleRow = styled.div`
  display: flex;
  gap: 10px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  background: ${(p) => (p.$active ? p.theme.colors.secondary : "transparent")};
  color: ${(p) => (p.$active ? "#000" : p.theme.colors.secondary)};
  border: 1px solid ${(p) => p.theme.colors.secondary};
  padding: 8px;
  border-radius: 6px;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: ${(p) => p.theme.colors.secondary}; color: #000; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
`;

const PrimaryButton = styled.button`
  flex: 1;
  background: ${(p) => p.theme.colors.primary};
  color: #000;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { filter: brightness(1.2); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SecondaryButton = styled.button`
  flex: 1;
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary || "#888"};
  border: 1px solid ${(p) => p.theme.colors.textSecondary || "#888"};
  padding: 10px;
  border-radius: 8px;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { color: #fff; border-color: #fff; }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary || "#888"};
  font-size: 1.2rem;
  cursor: pointer;
  &:hover { color: #fff; }
`;

const StatusMsg = styled.div<{ $error?: boolean }>`
  text-align: center;
  margin-top: 12px;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.7rem;
  color: ${(p) => (p.$error ? "#ff4444" : "#00ff88")};
`;

const InfoText = styled.p`
  font-size: 0.65rem;
  color: #666;
  text-align: center;
  margin: 16px 0 0 0;
  line-height: 1.4;
`;

const CHECK_FRAMES_OPTIONS = [0, 30, 60, 120, 180, 300, 600];
const LATENCY_RANGE = [0, 1, 2, 3];
const INPUT_BLOCK_OPTIONS = [0, 1, 3, 10];

interface NetplayConfig {
  netplay_check_frames: string;
  netplay_input_latency_frames_min: string;
  netplay_input_latency_frames_range: string;
  run_ahead_enabled: string;
  netplay_input_block_timeout: string;
}

interface NetplayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetplayConfigModal: React.FC<NetplayConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<NetplayConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadConfig();
    setStatusMsg(null);
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await (window as any).electron.ipcRenderer.invoke("read-netplay-config");
      if (res.success) setConfig(res.config);
      else setStatusMsg({ text: "Error al leer config: " + res.error, error: true });
    } catch (e: any) {
      setStatusMsg({ text: "Error: " + e.message, error: true });
    }
    setLoading(false);
  };

  const updateField = (key: keyof NetplayConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      for (const key of Object.keys(config) as (keyof NetplayConfig)[]) {
        await (window as any).electron.ipcRenderer.invoke("write-netplay-config", { key, value: config[key] });
      }
      setStatusMsg({ text: "✅ GUARDADO" });
    } catch (e: any) {
      setStatusMsg({ text: "Error al guardar: " + e.message, error: true });
    }
    setSaving(false);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleRestore = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await (window as any).electron.ipcRenderer.invoke("restore-netplay-config");
      await loadConfig();
      setStatusMsg({ text: "✅ VALORES RESTAURADOS" });
    } catch (e: any) {
      setStatusMsg({ text: "Error al restaurar: " + e.message, error: true });
    }
    setSaving(false);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <Title>⚙ CONFIGURACIÓN NETPLAY</Title>

        {loading && <StatusMsg>CARGANDO...</StatusMsg>}

        {!loading && !config && <StatusMsg $error>No se pudo cargar la configuración</StatusMsg>}

        {!loading && config && (
          <>
            <FieldGroup>
              <LabelRow>
                <TooltipLabel data-tip="Cada cuántos frames se sincroniza el estado entre ambas PCs. 30 = ~1 sincronización por segundo. A mayor valor, menos tiriteo pero más delay en detectar desyncs. OFF no tiene tiriteo pero puede haber desync.">check_frames</TooltipLabel>
                <ValueDisplay>{config.netplay_check_frames}</ValueDisplay>
              </LabelRow>
              <SegmentedControl>
                {CHECK_FRAMES_OPTIONS.map((v) => (
                  <SegButton
                    key={v}
                    $active={config.netplay_check_frames === String(v)}
                    onClick={() => updateField("netplay_check_frames", String(v))}
                  >
                    {v === 0 ? "OFF" : v}
                  </SegButton>
                ))}
              </SegmentedControl>
            </FieldGroup>

            <FieldGroup>
              <LabelRow>
                <TooltipLabel data-tip="Mínimo de frames de buffer de red. 1 = mínima latencia posible. Aumentar si hay tirones o stuttering.">latency min</TooltipLabel>
                <ValueDisplay>{config.netplay_input_latency_frames_min}</ValueDisplay>
              </LabelRow>
              <ButtonRow>
                <IncButton
                  disabled={Number(config.netplay_input_latency_frames_min) <= 0}
                  onClick={() => updateField("netplay_input_latency_frames_min", String(Math.max(0, Number(config.netplay_input_latency_frames_min) - 1)))}
                >−</IncButton>
                <IncButton
                  disabled={Number(config.netplay_input_latency_frames_min) >= 3}
                  onClick={() => updateField("netplay_input_latency_frames_min", String(Math.min(3, Number(config.netplay_input_latency_frames_min) + 1)))}
                >+</IncButton>
              </ButtonRow>
            </FieldGroup>

            <FieldGroup>
              <LabelRow>
                <TooltipLabel data-tip="Rango de frames que el buffer puede crecer dinámicamente ante fluctuaciones de red. Ej: min=1 + range=1 = buffer entre 1 y 2 frames.">latency range</TooltipLabel>
                <ValueDisplay>{config.netplay_input_latency_frames_range}</ValueDisplay>
              </LabelRow>
              <ButtonRow>
                <IncButton
                  disabled={Number(config.netplay_input_latency_frames_range) <= 0}
                  onClick={() => updateField("netplay_input_latency_frames_range", String(Math.max(0, Number(config.netplay_input_latency_frames_range) - 1)))}
                >−</IncButton>
                <IncButton
                  disabled={Number(config.netplay_input_latency_frames_range) >= 3}
                  onClick={() => updateField("netplay_input_latency_frames_range", String(Math.min(3, Number(config.netplay_input_latency_frames_range) + 1)))}
                >+</IncButton>
              </ButtonRow>
            </FieldGroup>

            <FieldGroup>
              <LabelRow>
                <TooltipLabel data-tip="Predice inputs del rival para reducir latencia percibida. Desactivado porque en netplay causa inputs duplicados del guest en el host.">run-ahead</TooltipLabel>
                <ValueDisplay>{config.run_ahead_enabled === "true" ? "ON" : "OFF"}</ValueDisplay>
              </LabelRow>
              <ToggleRow>
                <ToggleButton $active={config.run_ahead_enabled === "false"} onClick={() => updateField("run_ahead_enabled", "false")}>OFF</ToggleButton>
                <ToggleButton $active={config.run_ahead_enabled === "true"} onClick={() => updateField("run_ahead_enabled", "true")}>ON</ToggleButton>
              </ToggleRow>
            </FieldGroup>

            <FieldGroup>
              <LabelRow>
                <TooltipLabel data-tip="Timeout en frames para descartar inputs viejos. 0 = desactivado. 1-3 útil si hay inputs fantasma o rebote. Probado hasta 10 sin mejoras en tiriteo.">input block timeout</TooltipLabel>
                <ValueDisplay>{config.netplay_input_block_timeout}</ValueDisplay>
              </LabelRow>
              <SegmentedControl>
                {INPUT_BLOCK_OPTIONS.map((v) => (
                  <SegButton
                    key={v}
                    $active={config.netplay_input_block_timeout === String(v)}
                    onClick={() => updateField("netplay_input_block_timeout", String(v))}
                  >
                    {v === 0 ? "OFF" : v}
                  </SegButton>
                ))}
              </SegmentedControl>
            </FieldGroup>

            <ActionRow>
              <SecondaryButton onClick={handleRestore} disabled={saving}>RESTAURAR</SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? "GUARDANDO..." : "GUARDAR"}</PrimaryButton>
            </ActionRow>

            {statusMsg && <StatusMsg $error={statusMsg.error}>{statusMsg.text}</StatusMsg>}

            <InfoText>
              Los cambios se guardan en netplay_optimized.cfg y persisten entre sesiones.
              Valores probados: check=30, min=1, range=1, run_ahead=OFF.
            </InfoText>
          </>
        )}
      </ModalBox>
    </Overlay>
  );
};
