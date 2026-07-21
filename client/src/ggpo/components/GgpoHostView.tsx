import React from "react"
import styled, { keyframes } from "styled-components"
import { useGgpo } from "../context/GgpoContext"

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surface}22;
`

const Waiting = styled.div`
  animation: ${pulse} 1.5s ease-in-out infinite;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.9rem;
  color: ${(p) => p.theme.colors.accent};
`

const Info = styled.div`
  font-size: 0.7rem;
  color: ${(p) => p.theme.colors.textDim};
  text-align: center;
  line-height: 1.5;
`

const CancelBtn = styled.button`
  background: transparent;
  border: 1px solid ${(p) => p.theme.colors.danger};
  color: ${(p) => p.theme.colors.danger};
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.75rem;
  &:hover { background: ${(p) => p.theme.colors.danger}22; }
`

export function GgpoHostView() {
  const { hostRoom, cancelHosting } = useGgpo()

  return (
    <Container>
      <Waiting>ESPERANDO OPONENTE...</Waiting>
      <Info>
        IP: {hostRoom?.hostIp ?? "—"}<br />
        Puerto: {hostRoom?.hostPort ?? 6003}
        <br />
        Compartí tu IP con un amigo para que se una
      </Info>
      <CancelBtn onClick={cancelHosting}>CANCELAR SALA</CancelBtn>
    </Container>
  )
}
