/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useSocial } from "../../context/SocialContext"
import { useToast } from "../../context/ToastContext"
import { publishGgpoRoom, fetchGgpoRoom, updateGgpoRoom, deleteGgpoRoom, findActiveGgpoRooms } from "../lib/ggpoNet"
import type { GgpoRoom } from "../lib/ggpoNet"

export type GgpoEngine = "retroarch" | "ggpo"
export type GgpoStatus = "idle" | "hosting" | "waiting_guest" | "joining" | "connected" | "error"

interface GgpoContextType {
  engine: GgpoEngine
  setEngine: (e: GgpoEngine) => void
  status: GgpoStatus
  errorMsg: string | null
  hostRoom: GgpoRoom | null
  discoveredRooms: { userId: string; room: GgpoRoom }[]
  startHosting: (method: "lan" | "tailscale", myIp: string) => Promise<void>
  cancelHosting: () => Promise<void>
  joinRoom: (hostUserId: string, room: GgpoRoom) => Promise<void>
  dismissError: () => void
}

const GgpoContext = createContext<GgpoContextType>(null!)

export function GgpoProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngine] = useState<GgpoEngine>("retroarch")
  const [status, setStatus] = useState<GgpoStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hostRoom, setHostRoom] = useState<GgpoRoom | null>(null)
  const [discoveredRooms, setDiscoveredRooms] = useState<{ userId: string; room: GgpoRoom }[]>([])
  const { isAuthenticated, userId } = useAuth()
  const { onlineUsers } = useSocial()
  const { show } = useToast()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const guestDetectedRef = useRef(false)

  const dismissError = useCallback(() => setErrorMsg(null), [])

  const startHosting = useCallback(
    async (method: "lan" | "tailscale", myIp: string) => {
      if (!userId) return
      try {
        const room: GgpoRoom = {
          hostId: userId,
          hostIp: myIp,
          hostPort: 6003,
          method,
          status: "waiting",
          timestamp: Date.now(),
        }
        await publishGgpoRoom(room)
        setHostRoom(room)
        setStatus("waiting_guest")
        show("SALA GGPO CREADA — esperando oponente...", "info")

        guestDetectedRef.current = false
        pollingRef.current = setInterval(async () => {
          try {
            const updated = await fetchGgpoRoom(userId)
            if (updated && updated.guestIp && !guestDetectedRef.current) {
              guestDetectedRef.current = true
              setStatus("connected")
              setHostRoom(updated)
              show("Oponente conectado. Iniciando GGPO...", "success")

              const electron = (window as any).electron
              await electron.ipcRenderer.invoke("ggpo-launch", {
                rom: "kof98",
                localPort: 6003,
                remoteIp: updated.guestIp,
                remotePort: updated.guestPort ?? 6004,
                playerNumber: 0,
              })

              if (pollingRef.current) clearInterval(pollingRef.current)
            }
          } catch {
            // Polling error, will retry
          }
        }, 2000)
      } catch (e: any) {
        setErrorMsg(e.message || "Error al crear sala GGPO")
        setStatus("error")
      }
    },
    [userId, show],
  )

  const cancelHosting = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const electron = (window as any).electron
    await electron.ipcRenderer.invoke("ggpo-kill")
    try { await deleteGgpoRoom() } catch {
      // Ignore deletion errors
    }
    setHostRoom(null)
    setStatus("idle")
    show("Sala GGPO cancelada", "warning")
  }, [show])

  const joinRoom = useCallback(
    async (hostUserId: string, room: GgpoRoom) => {
      if (!userId) return
      try {
        setStatus("joining")
        await updateGgpoRoom({
          guestId: userId,
          guestIp: room.hostIp,
          guestPort: 6004,
          status: "ready",
        })

        const electron = (window as any).electron
        await electron.ipcRenderer.invoke("ggpo-launch", {
          rom: "kof98",
          localPort: 6004,
          remoteIp: room.hostIp,
          remotePort: room.hostPort,
          playerNumber: 1,
        })

        setStatus("connected")
        show("GGPO conectado!", "success")
      } catch (e: any) {
        setErrorMsg(e.message || "Error al unirse a sala GGPO")
        setStatus("error")
      }
    },
    [userId, show],
  )

  const prevActiveRef = useRef(false)

  useEffect(() => {
    const isActive = isAuthenticated && engine === "ggpo"
    if (!isActive) {
      if (prevActiveRef.current) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDiscoveredRooms([])
      }
      prevActiveRef.current = false
      return
    }
    prevActiveRef.current = true
    const poll = async () => {
      const userIds = onlineUsers.map((u: any) => u.id || u.userId).filter(Boolean)
      const rooms = await findActiveGgpoRooms(userIds)
      setDiscoveredRooms(rooms)
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => clearInterval(iv)
  }, [isAuthenticated, engine, onlineUsers])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  return (
    <GgpoContext.Provider
      value={{
        engine,
        setEngine,
        status,
        errorMsg,
        hostRoom,
        discoveredRooms,
        startHosting,
        cancelHosting,
        joinRoom,
        dismissError,
      }}
    >
      {children}
    </GgpoContext.Provider>
  )
}

export function useGgpo() {
  return useContext(GgpoContext)
}

export default GgpoContext
