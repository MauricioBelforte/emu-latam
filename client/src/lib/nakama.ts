import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";

const USE_SSL = false; // Localhost sin HTTPS
const HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const PORT = "7350";
const SERVER_KEY = "defaultkey";

class NakamaService {
  public client: Client;
  public session: Session | null = null;
  public socket: Socket | null = null;

  constructor() {
    this.client = new Client(SERVER_KEY, HOST, PORT, USE_SSL);
  }

  // 1. Autenticar dispositivo anónimo
  async authenticateDevice(customId?: string): Promise<Session> {
    const deviceId =
      customId ||
      `dev-${crypto.randomUUID()}-${window.location.port || "default"}`;

    // Guardamos este ID solo para esta sesión de la ventana
    console.log("Autenticando con Device ID Único:", deviceId);

    try {
      this.session = await this.client.authenticateDevice(deviceId, true);
      localStorage.setItem("nakama_session", JSON.stringify(this.session));
      return this.session;
    } catch (error) {
      console.error("Error autenticando con Nakama:", error);
      throw error;
    }
  }

  // 2. Restaurar sesión previa sin volver a loguear si no ha expirado
  restoreSession(): boolean {
    const sessionString = localStorage.getItem("nakama_session");
    if (sessionString) {
      try {
        const sessionObj = JSON.parse(sessionString);
        // Creamos una nueva instancia de Session usando el objeto parseado
        const session = Session.restore(
          sessionObj.token,
          sessionObj.refresh_token,
        );

        // Verificar si expiró
        if (session.isexpired(Date.now() / 1000)) {
          console.warn("La sesión ha expirado");
          localStorage.removeItem("nakama_session");
          return false;
        }

        this.session = session;
        return true;
      } catch (e) {
        console.error("Error restaurando sesión:", e);
        return false;
      }
    }
    return false;
  }

  private connectionPromise: Promise<Socket> | null = null;

  // 4. Guardar URL del relay en Nakama Storage (público)
  async saveRelayUrl(url: string): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.client.writeStorageObjects(this.session, [
        {
          collection: "active_relay",
          key: "latest",
          value: {
            url,
            user_id: this.session.user_id,
            username: this.session.username,
            timestamp: Date.now(),
          },
          permission_read: 2, // público
          permission_write: 1, // solo owner
        },
      ]);
      console.log("✅ Relay URL guardada en Nakama:", url);
      return true;
    } catch (e) {
      console.error("❌ Error guardando relay URL:", e);
      return false;
    }
  }

  // 5. Leer la última URL de relay de cualquier usuario
  async getLatestRelayUrl(): Promise<string | null> {
    if (!this.session) return null;
    try {
      const result = await this.client.listStorageObjects(
        this.session,
        "active_relay",
        undefined,
        10,
      );
      if (result.objects && result.objects.length > 0) {
        const objects = result.objects
          .map((obj) => ({
            ...obj,
            parsed:
              typeof obj.value === "string" ? JSON.parse(obj.value) : obj.value,
          }))
          .sort(
            (a, b) => (b.parsed?.timestamp ?? 0) - (a.parsed?.timestamp ?? 0),
          );
        if (objects[0]?.parsed?.url) {
          console.log("✅ Relay URL leída de Nakama:", objects[0].parsed.url);
          return objects[0].parsed.url as string;
        }
      }
      return null;
    } catch (e) {
      console.error("❌ Error leyendo relay URL:", e);
      return null;
    }
  }

  // 3. Conectar al WebSocket
  async connectSocket(): Promise<Socket> {
    if (!this.session) {
      throw new Error("No hay sesión activa para conectar el socket");
    }

    // Si ya hay un intento en curso, esperar a ese intento
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        // El socket requiere appearOnline: true para que otros nos vean
        this.socket = this.client.createSocket(USE_SSL, false);

        // Configurar listeners antes de conectar
        this.socket.ondisconnect = (event) => {
          console.log("Socket desconectado:", event);
          this.connectionPromise = null;
          this.socket = null;
        };

        this.socket.onerror = (error) => {
          console.error("Error en Socket:", error);
        };

        // Sistema de distribución de mensajes (multicast)
        this.socket.onchannelmessage = (message) => {
          const event = new CustomEvent("nakama_message", { detail: message });
          window.dispatchEvent(event);
        };

        // this.session! es seguro aquí porque lo validamos arriba
        await this.socket.connect(this.session!, true);
        console.log("¡Socket Nakama conectado exitosamente!");

        // Mantener la promesa como resuelta para futuros llamados rápidos
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

// Exportamos un Singleton para que toda la app use el mismo cliente
export const nakamaService = new NakamaService();
