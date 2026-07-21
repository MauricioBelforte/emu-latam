import React from "react"
import styled from "styled-components"
import { useGgpo } from "../context/GgpoContext"

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
`

const ToggleLabel = styled.span<{ $active: boolean }>`
  font-size: 0.75rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  color: ${(p) => (p.$active ? p.theme.colors.primary : p.theme.colors.textDim)};
  transition: color 0.2s;
`

const Switch = styled.button<{ $active: boolean; $disabled: boolean }>`
  width: 44px;
  height: 22px;
  border-radius: 11px;
  border: 2px solid ${(p) => (p.$active ? p.theme.colors.primary : p.theme.colors.border)};
  background: ${(p) => (p.$active ? p.theme.colors.primary + "44" : "transparent")};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.4 : 1)};
  position: relative;
  transition: all 0.2s;
`

const Knob = styled.span<{ $active: boolean }>`
  position: absolute;
  top: 1px;
  left: ${(p) => (p.$active ? "23px" : "1px")};
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? p.theme.colors.primary : "#888")};
  transition: left 0.2s;
`

const Tooltip = styled.span`
  font-size: 0.6rem;
  color: ${(p) => p.theme.colors.textDim};
  font-style: italic;
`

interface Props {
  disabled?: boolean
  disabledReason?: string
}

export function GgpoToggle({ disabled = false, disabledReason }: Props) {
  const { engine, setEngine } = useGgpo()
  const active = engine === "ggpo"

  return (
    <ToggleRow>
      <ToggleLabel $active={!active}>RETROARCH</ToggleLabel>
      <Switch
        $active={active}
        $disabled={disabled}
        disabled={disabled}
        onClick={() => !disabled && setEngine(active ? "retroarch" : "ggpo")}
        title={disabled ? disabledReason : ""}
      >
        <Knob $active={active} />
      </Switch>
      <ToggleLabel $active={active}>GGPO</ToggleLabel>
      {disabled && disabledReason && <Tooltip>⚠ {disabledReason}</Tooltip>}
    </ToggleRow>
  )
}
