import React, { useState } from "react"
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

const IpDisplay = styled.p`
  color: #fff;
  font-family: monospace;
  font-size: 1.3rem;
  background: #000;
  padding: 10px 18px;
  border-radius: 6px;
  border: 2px solid ${(p) => p.theme.colors.accent};
  display: inline-block;
  margin: 4px 0;
  cursor: pointer;
  user-select: text;
  letter-spacing: 1px;
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

interface Props {
  myIp: string
}

export function GgpoHostView({ myIp }: Props) {
  const { hostRoom, cancelHosting, status, guestName } = useGgpo()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(myIp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === "connected" && guestName) {
    return (
      <Container>
        <Waiting style={{ color: "#0f0", animation: "none" }}>¡OPONENTE CONECTADO!</Waiting>
        <Info>
          <span style={{ fontSize: "1rem", color: "#fff" }}>{guestName}</span> se unió a tu sala
        </Info>
        <Info>GGPO iniciado — cerrá esta ventana si no ves el juego</Info>
      </Container>
    )
  }

  return (
    <Container>
      <Waiting>ESPERANDO OPONENTE...</Waiting>
      <Info>
        Tu IP (click para copiar):
      </Info>
      <IpDisplay onClick={handleCopy} title="Click para copiar">
        {myIp} <span style={{ fontSize: "0.9rem" }}>{copied ? "✅" : "📋"}</span>
      </IpDisplay>
      <Info>
        {copied
          ? "✅ IP copiada. Pasásela a tu amigo para que se una."
          : "Compartí esta IP con un amigo para que se una a tu sala GGPO"}
        <br />
        Puerto: {hostRoom?.hostPort ?? 6003}
      </Info>
      <CancelBtn onClick={cancelHosting}>CANCELAR SALA</CancelBtn>
    </Container>
  )
}
