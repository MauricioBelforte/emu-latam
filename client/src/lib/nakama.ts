import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";

const USE_SSL = false; // Localhost sin HTTPS
const HOST = "127.0.0.1";
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
