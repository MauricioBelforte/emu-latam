/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useSocial } from "../../context/SocialContext"
import { useToast } from "../../context/ToastContext"
import { publishGgpoRoom, fetchGgpoRoom, deleteGgpoRoom, findActiveGgpoRooms, findGuestRoomsForHost } from "../lib/ggpoNet"
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
  const onlineUsersRef = useRef<{ id?: string; userId?: string }[]>([])
  onlineUsersRef.current = onlineUsers

  const dismissError = useCallback(() => setErrorMsg(null), [])

  const startHosting = useCallback(
    async (method: "lan" | "tailscale", myIp: string) => {
      if (!userId) return
      try {
        const savedName = localStorage.getItem("emu_display_name")
        const room: GgpoRoom = {
          hostId: userId,
          hostIp: myIp,
          hostPort: 6003,
          hostName: savedName || undefined,
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
            console.log("[GGPO] Host polling: buscando guests...")
            const userIds = onlineUsersRef.current.map((u: any) => u.id || u.userId).filter(Boolean)
            const guestRooms = await findGuestRoomsForHost(userId, userIds)
            console.log("[GGPO] Host polling: guests encontrados:", guestRooms.length)
            if (guestRooms.length > 0 && !guestDetectedRef.current) {
              guestDetectedRef.current = true
              const guest = guestRooms[0]
              setStatus("connected")
              show("Oponente conectado. Iniciando GGPO...", "success")

              const electron = (window as any).electron
              const hostName = localStorage.getItem("emu_display_name")
              await electron.ipcRenderer.invoke("ggpo-launch", {
                rom: "kof98",
                localPort: 6003,
                remoteIp: guest.room.hostIp,
                remotePort: guest.room.hostPort ?? 6004,
                playerNumber: 0,
                playerName: hostName || undefined,
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
        const electron = (window as any).electron
        const ipResult = await electron.ipcRenderer.invoke("get-lan-ip")
        const guestIp = ipResult.ip || room.hostIp
        const savedName = localStorage.getItem("emu_display_name")
        await electron.ipcRenderer.invoke("ggpo-launch", {
          rom: "kof98",
          localPort: 6004,
          remoteIp: room.hostIp,
          remotePort: room.hostPort,
          playerNumber: 1,
          playerName: savedName || undefined,
        })
        await publishGgpoRoom({
          hostId: userId,
          hostIp: guestIp,
          hostPort: 6004,
          guestName: savedName || undefined,
          method: room.method,
          status: "joining",
          targetHostId: hostUserId,
          timestamp: Date.now(),
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
      const userIds = onlineUsersRef.current.map((u: any) => u.id || u.userId).filter(Boolean)
      console.log("[GGPO] Discovery: onlineUsers IDs:", userIds, "onlineUsers raw:", onlineUsersRef.current.map(u => ({ id: (u as any).id, userId: (u as any).userId })))
      const rooms = await findActiveGgpoRooms(userIds)
      console.log("[GGPO] Discovery: salas encontradas:", rooms.length)
      if (rooms.length > 0) console.log("[GGPO] Discovery: room hostIds:", rooms.map(r => r.room.hostId))
      setDiscoveredRooms(rooms)
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => clearInterval(iv)
  }, [isAuthenticated, engine])

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
