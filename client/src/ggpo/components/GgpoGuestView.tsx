import React from "react"
import styled from "styled-components"
import { useGgpo } from "../context/GgpoContext"
import type { GgpoRoom } from "../lib/ggpoNet"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`

const RoomCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  background: ${(p) => p.theme.colors.surface}33;
`

const RoomInfo = styled.div`
  font-size: 0.75rem;
  color: ${(p) => p.theme.colors.text};
  span { color: ${(p) => p.theme.colors.textDim}; font-size: 0.65rem; }
`

const JoinBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: #000;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.7rem;
  &:hover { opacity: 0.85; }
`

const Empty = styled.div`
  font-size: 0.7rem;
  color: ${(p) => p.theme.colors.textDim};
  text-align: center;
  padding: 16px;
`

interface Props {
  onJoin: (userId: string, room: GgpoRoom) => void
}

export function GgpoGuestView({ onJoin }: Props) {
  const { discoveredRooms } = useGgpo()

  if (discoveredRooms.length === 0) {
    return <Empty>No hay salas GGPO disponibles</Empty>
  }

  return (
    <Container>
      {discoveredRooms.map(({ userId, room }) => (
        <RoomCard key={userId}>
          <RoomInfo>
            Sala GGPO <span>• {room.method.toUpperCase()}</span>
            <br />
            <span>IP: {room.hostIp}:{room.hostPort}</span>
          </RoomInfo>
          <JoinBtn onClick={() => onJoin(userId, room)}>UNIRSE</JoinBtn>
        </RoomCard>
      ))}
    </Container>
  )
}
