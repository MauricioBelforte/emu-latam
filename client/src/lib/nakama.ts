import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";

const USE_SSL = false;
const SERVER_KEY = "defaultkey";

class NakamaService {
  public session: Session | null = null;
  public socket: Socket | null = null;
  private _client: Client | null = null;
  private _host = "127.0.0.1";
  private _port = "7350";

  get client(): Client {
    if (!this._client) {
      this._client = new Client(SERVER_KEY, this._host, this._port, USE_SSL);
    }
    return this._client;
  }

  async configure(host: string, port: string): Promise<void> {
    this._host = host;
    this._port = port;
    this._client = new Client(SERVER_KEY, host, port, USE_SSL);
  }

  async authenticateDevice(customId?: string): Promise<Session> {
    const deviceId = customId || `dev-${crypto.randomUUID()}-${window.location.port || "default"}`;
    try {
      const username = `Player ${Math.floor(Math.random() * 999) + 1}`;
      this.session = await this.client.authenticateDevice(deviceId, true, username);
      localStorage.setItem("nakama_session", JSON.stringify(this.session));
      return this.session;
    } catch (error) {
      console.error("Error autenticando con Nakama:", error);
      throw error;
    }
  }

  restoreSession(): boolean {
    const sessionString = localStorage.getItem("nakama_session");
    if (sessionString) {
      try {
        const sessionObj = JSON.parse(sessionString);
        const session = Session.restore(sessionObj.token, sessionObj.refresh_token);
        if (session.isexpired(Date.now() / 1000)) {
          localStorage.removeItem("nakama_session");
          return false;
        }
        this.session = session;
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private connectionPromise: Promise<Socket> | null = null;

  async saveRelayUrl(url: string): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.writeStorageObjects(this.session, [
        { collection: "active_relay", key: "latest", value: { url, user_id: this.session.user_id, username: this.session.username, timestamp: Date.now() }, permission_read: 2, permission_write: 1 },
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async getLatestRelayUrl(): Promise<string | null> {
    if (!this.session) return null;
    try {
      const result = await this.client.listStorageObjects(this.session, "active_relay", undefined, 10);
      if (result.objects && result.objects.length > 0) {
        const objects = result.objects.map((obj) => ({ ...obj, parsed: typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value })).sort((a, b) => (b.parsed?.timestamp ?? 0) - (a.parsed?.timestamp ?? 0));
        return (objects[0]?.parsed?.url as string) || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async publishHostInfo(ip: string, mode: string): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.writeStorageObjects(this.session, [
        {
          collection: "emu_latam_rooms",
          key: "active_host",
          value: { ip, mode, username: this.session.username, userId: this.session.user_id, timestamp: Date.now() },
          permission_read: 2,
          permission_write: 1,
        },
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async fetchHostInfoForUser(targetUserId: string): Promise<{ ip: string; mode: string; username: string } | null> {
    if (!this.session) return null;
    try {
      const result = await this.client.readStorageObjects(this.session, {
        object_ids: [{ collection: "emu_latam_rooms", key: "active_host", user_id: targetUserId }],
      });
      if (result.objects && result.objects.length > 0) {
        const obj = result.objects[0];
        const value = typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value;
        return { ip: value.ip, mode: value.mode, username: value.username };
      }
      return null;
    } catch {
      return null;
    }
  }

  async publishP2pCandidate(candidate: any): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.writeStorageObjects(this.session, [
        {
          collection: "emu_p2p",
          key: "host_candidate",
          value: { ...candidate, userId: this.session.user_id, username: this.session.username, timestamp: Date.now() },
          permission_read: 2,
          permission_write: 1,
        },
      ]);
      return true;
    } catch { return false; }
  }

  async fetchP2pCandidate(targetUserId: string): Promise<any | null> {
    if (!this.session) return null;
    try {
      const result = await this.client.readStorageObjects(this.session, {
        object_ids: [{ collection: "emu_p2p", key: "host_candidate", user_id: targetUserId }],
      });
      if (result.objects && result.objects.length > 0) {
        const obj = result.objects[0];
        return typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value;
      }
      return null;
    } catch { return null; }
  }

  async publishP2pGuestCandidate(candidate: any, hostUserId: string): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.writeStorageObjects(this.session, [
        {
          collection: "emu_p2p",
          key: `guest_candidate_${hostUserId}`,
          value: { ...candidate, userId: this.session.user_id, username: this.session.username, timestamp: Date.now() },
          permission_read: 2,
          permission_write: 1,
        },
      ]);
      return true;
    } catch { return false; }
  }

  async fetchP2pGuestCandidate(guestUserId: string): Promise<any | null> {
    if (!this.session) return null;
    try {
      const result = await this.client.readStorageObjects(this.session, {
        object_ids: [{ collection: "emu_p2p", key: `guest_candidate_${this.session.user_id}`, user_id: guestUserId }],
      });
      if (result.objects && result.objects.length > 0) {
        const obj = result.objects[0];
        return typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value;
      }
      return null;
    } catch { return null; }
  }

  async listAllP2pObjects(): Promise<any[]> {
    if (!this.session) return [];
    try {
      const result = await this.client.listStorageObjects(this.session, "emu_p2p");
      return (result.objects || []).map(obj => {
        const val = typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value;
        return { ...val, userId: obj.user_id, key: obj.key };
      });
    } catch { return []; }
  }

  async deleteP2pCandidates(): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.deleteStorageObjects(this.session, {
        object_ids: [
          { collection: "emu_p2p", key: "host_candidate" },
        ],
      });
      return true;
    } catch { return false; }
  }

  disconnect(): void {
    if (this.socket) {
      try { this.socket.disconnect(); } catch {}
      this.socket = null;
    }
    this.connectionPromise = null;
    this.session = null;
    this._client = null;
  }

  async connectSocket(): Promise<Socket> {
    if (!this.session) throw new Error("No hay sesin activa");
    if (this.connectionPromise) return this.connectionPromise;
    this.connectionPromise = (async () => {
      try {
        this.socket = this.client.createSocket(USE_SSL, false);
        this.socket.ondisconnect = () => { this.connectionPromise = null; this.socket = null; };
        this.socket.onerror = (error) => console.error("Error en Socket:", error);
        this.socket.onchannelmessage = (message) => {
          window.dispatchEvent(new CustomEvent("nakama_message", { detail: message }));
        };
        await this.socket.connect(this.session!, true);
        return this.socket;
      } catch (error) {
        this.connectionPromise = null;
        this.socket = null;
        throw error;
      }
    })();
    return this.connectionPromise;
  }
}

export const nakamaService = new NakamaService();
