import { nakamaService } from "../../lib/nakama"

export interface GgpoRoom {
  hostId: string
  hostIp: string
  hostPort: number
  hostName?: string
  method: "lan" | "tailscale"
  status: "waiting" | "joining" | "playing"
  guestId?: string
  guestIp?: string
  guestPort?: number
  guestName?: string
  targetHostId?: string
  timestamp: number
}

const COLLECTION = "emu_latam_ggpo"
const KEY = "active_room"

async function getSessionUserId(): Promise<string | null> {
  return nakamaService.session?.user_id ?? null
}

export async function publishGgpoRoom(room: GgpoRoom): Promise<void> {
  const session = nakamaService.session
  if (!session) throw new Error("No hay sesión Nakama activa")
  await nakamaService.client.writeStorageObjects(session, [
    {
      collection: COLLECTION,
      key: KEY,
      value: room,
      permission_read: 2,
      permission_write: 1,
    },
  ])
}

export async function fetchGgpoRoom(userId: string): Promise<GgpoRoom | null> {
  const session = nakamaService.session
  if (!session) return null
  try {
    const result = await nakamaService.client.readStorageObjects(session, {
      object_ids: [{ collection: COLLECTION, key: KEY, user_id: userId }],
    })
    if (result.objects && result.objects.length > 0) {
      const obj = result.objects[0]
      return (typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value) as GgpoRoom
    }
    return null
  } catch {
    return null
  }
}

export async function deleteGgpoRoom(): Promise<void> {
  const userId = await getSessionUserId()
  if (!userId) return
  const session = nakamaService.session
  if (!session) return
  try {
    await nakamaService.client.deleteStorageObjects(session, [
      { collection: COLLECTION, key: KEY, user_id: userId },
    ])
  } catch {
    // Silently ignore if room doesn't exist
  }
}

export async function findActiveGgpoRooms(onlineUserIds: string[]): Promise<{ userId: string; room: GgpoRoom }[]> {
  const results: { userId: string; room: GgpoRoom }[] = []
  for (const uid of onlineUserIds) {
    const room = await fetchGgpoRoom(uid)
    if (room && room.status === "waiting") {
      results.push({ userId: uid, room })
    }
  }
  return results
}

export async function findGuestRoomsForHost(hostUserId: string, onlineUserIds: string[]): Promise<{ userId: string; room: GgpoRoom }[]> {
  const results: { userId: string; room: GgpoRoom }[] = []
  for (const uid of onlineUserIds) {
    if (uid === hostUserId) continue
    const room = await fetchGgpoRoom(uid)
    if (room && room.status === "joining" && room.targetHostId === hostUserId) {
      results.push({ userId: uid, room })
    }
  }
  return results
}
