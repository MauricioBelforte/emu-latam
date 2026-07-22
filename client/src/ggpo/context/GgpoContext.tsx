/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useSocial } from "../../context/SocialContext"
import { useToast } from "../../context/ToastContext"
import { nakamaService } from "../../lib/nakama"
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
  guestName: string | null
  startHosting: (method: "lan" | "tailscale", myIp: string) => Promise<void>
  cancelHosting: () => Promise<void>
  joinRoom: (hostUserId: string, room: GgpoRoom) => Promise<void>
  dismissError: () => void
}

const GgpoContext = createContext<GgpoContextType>(null!)

const GGPO_ROOM_OPEN = "ggpo_room_open"
const GGPO_ROOM_CLOSE = "ggpo_room_close"
const GGPO_GUEST_JOIN = "ggpo_guest_join"
const ROOM_STALE_MS = 15000

export function GgpoProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngine] = useState<GgpoEngine>("retroarch")
  const [status, setStatus] = useState<GgpoStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hostRoom, setHostRoom] = useState<GgpoRoom | null>(null)
  const [discoveredRooms, setDiscoveredRooms] = useState<{ userId: string; room: GgpoRoom }[]>([])
  const [guestName, setGuestName] = useState<string | null>(null)
  const { isAuthenticated, userId, username } = useAuth()
  const { channelId } = useSocial()
  const { show } = useToast()
  const statusRef = useRef(status)
  statusRef.current = status
  const userIdRef = useRef(userId)
  userIdRef.current = userId
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId
  const usernameRef = useRef(username)
  usernameRef.current = username

  const dismissError = useCallback(() => setErrorMsg(null), [])

  const sendLobby = useCallback(async (type: string, payload: Record<string, unknown>) => {
    const ch = channelIdRef.current
    if (!nakamaService.socket || !ch) return
    try {
      await nakamaService.socket.writeChatMessage(ch, {
        _type: type,
        senderId: userIdRef.current,
        ...payload,
      })
    } catch {}
  }, [])

  const startHosting = useCallback(
    async (method: "lan" | "tailscale", myIp: string) => {
      const uid = userIdRef.current
      if (!uid) { setErrorMsg("No autenticado"); setStatus("error"); return }
      if (!channelIdRef.current) { setErrorMsg("Debes estar en el Lobby para crear sala GGPO"); setStatus("error"); return }
      try {
        const savedName = localStorage.getItem("emu_display_name")
        const room: GgpoRoom = {
          hostId: uid,
          hostIp: myIp,
          hostPort: 6003,
          hostName: savedName || undefined,
          method,
          status: "waiting",
          timestamp: Date.now(),
        }
        setHostRoom(room)
        setStatus("waiting_guest")
        await sendLobby(GGPO_ROOM_OPEN, {
          hostIp: myIp,
          hostPort: 6003,
          hostName: savedName || undefined,
          method,
          timestamp: room.timestamp,
        })
        show("SALA GGPO CREADA — esperando oponente...", "info")
      } catch (e: any) {
        setErrorMsg(e.message || "Error al crear sala GGPO")
        setStatus("error")
      }
    },
    [sendLobby, show],
  )

  const cancelHosting = useCallback(async () => {
    const electron = (window as any).electron
    await electron.ipcRenderer.invoke("ggpo-kill").catch(() => {})
    await sendLobby(GGPO_ROOM_CLOSE, {})
    setGuestName(null)
    setHostRoom(null)
    setStatus("idle")
    show("Sala GGPO cancelada", "warning")
  }, [sendLobby, show])

  const joinRoom = useCallback(
    async (hostUserId: string, room: GgpoRoom) => {
      const uid = userIdRef.current
      if (!uid) return
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
        await sendLobby(GGPO_GUEST_JOIN, {
          targetHostId: hostUserId,
          guestIp,
          guestPort: 6004,
          guestName: savedName || undefined,
        })
        setStatus("connected")
        show("GGPO conectado!", "success")
      } catch (e: any) {
        setErrorMsg(e.message || "Error al unirse a sala GGPO")
        setStatus("error")
      }
    },
    [sendLobby, show],
  )

  // Message listener: room discovery + host detects guest join
  useEffect(() => {
    if (!isAuthenticated) return

    const handler = (event: Event) => {
      const message = (event as CustomEvent).detail
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content
        if (!content._type) return
        const sender = message.sender_id || content.senderId
        if (sender === userIdRef.current) return

        if (content._type === GGPO_ROOM_OPEN) {
          const room: GgpoRoom = {
            hostId: sender,
            hostIp: content.hostIp,
            hostPort: content.hostPort || 6003,
            hostName: content.hostName || undefined,
            method: content.method || "lan",
            status: "waiting",
            timestamp: content.timestamp || Date.now(),
          }
          if (Date.now() - room.timestamp > ROOM_STALE_MS) return
          setDiscoveredRooms(prev => {
            if (prev.find(r => r.userId === sender)) return prev
            return [...prev, { userId: sender, room }]
          })
        }

        if (content._type === GGPO_ROOM_CLOSE) {
          setDiscoveredRooms(prev => prev.filter(r => r.userId !== sender))
        }

        if (content._type === GGPO_GUEST_JOIN && statusRef.current === "waiting_guest") {
          if (content.targetHostId === userIdRef.current) {
            setGuestName(content.guestName || null)
            setStatus("connected")
            show("Oponente conectado. Iniciando GGPO...", "success")
            const electron = (window as any).electron
            const hostName = localStorage.getItem("emu_display_name")
            electron.ipcRenderer.invoke("ggpo-launch", {
              rom: "kof98",
              localPort: 6003,
              remoteIp: content.guestIp,
              remotePort: content.guestPort || 6004,
              playerNumber: 0,
              playerName: hostName || undefined,
            }).catch((e: any) => {
              console.error("Error lanzando GGPO host:", e)
              setStatus("error")
            })
          }
        }
      } catch {}
    }

    window.addEventListener("nakama_message", handler)
    return () => window.removeEventListener("nakama_message", handler)
  }, [isAuthenticated, show])

  // Stale room cleanup
  useEffect(() => {
    if (!isAuthenticated || engine !== "ggpo") return
    const iv = setInterval(() => {
      setDiscoveredRooms(prev =>
        prev.filter(r => Date.now() - r.room.timestamp < ROOM_STALE_MS)
      )
    }, 5000)
    return () => clearInterval(iv)
  }, [isAuthenticated, engine])

  // Re-envío periódico de sala mientras espera guest
  const hostRoomRef = useRef<GgpoRoom | null>(null)
  hostRoomRef.current = hostRoom
  useEffect(() => {
    if (status !== "waiting_guest" || !hostRoomRef.current) return
    const iv = setInterval(() => {
      const r = hostRoomRef.current
      if (!r) return
      sendLobby(GGPO_ROOM_OPEN, {
        hostIp: r.hostIp,
        hostPort: r.hostPort,
        hostName: r.hostName,
        method: r.method,
        timestamp: Date.now(),
      })
    }, 5000)
    return () => clearInterval(iv)
  }, [status, sendLobby])

  useEffect(() => {
    if (engine !== "ggpo") setDiscoveredRooms([])
  }, [engine])

  return (
    <GgpoContext.Provider
      value={{
        engine,
        setEngine,
        status,
        errorMsg,
        hostRoom,
        discoveredRooms,
        guestName,
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
