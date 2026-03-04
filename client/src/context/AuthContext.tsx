import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { nakamaService } from "../lib/nakama";

interface AuthContextType {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  loginGhost: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  username: null,
  isAuthenticated: false,
  isConnected: false,
  loginGhost: async () => {}, // placeholder
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Keep track of connection attempts
  const isConnecting = useRef(false);

  // Intentar restaurar sesión al montar el app
  useEffect(() => {
    const initAuth = async () => {
      if (isConnecting.current) return;

      const restored = nakamaService.restoreSession();
      if (restored && nakamaService.session) {
        console.log("Sesión previa recuperada");
        setUserId(nakamaService.session.user_id || null);
        setUsername(nakamaService.session.username || null);
        setIsAuthenticated(true);

        try {
          isConnecting.current = true;
          await nakamaService.connectSocket();
          setIsConnected(true);
        } catch (e) {
          console.error("Fallo conectando el WebSocket restaurado:", e);
        } finally {
          isConnecting.current = false;
        }
      }
    };
    initAuth();
  }, []);

  // Función pública para login anónimo (Device ID)
  const loginGhost = async () => {
    if (isConnecting.current) return;

    try {
      isConnecting.current = true;
      const session = await nakamaService.authenticateDevice();
      setUserId(session.user_id || null);
      setUsername(session.username || null);
      setIsAuthenticated(true);

      const socket = await nakamaService.connectSocket();

      // Listener para si se desconecta de golpe
      socket.ondisconnect = () => {
        setIsConnected(false);
      };

      setIsConnected(true);
    } catch (e) {
      console.error("Fallo durante loginGhost:", e);
      alert("Error intentando conectar con Nakama Server local.");
    } finally {
      isConnecting.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ userId, username, isAuthenticated, isConnected, loginGhost }}
    >
      {children}
    </AuthContext.Provider>
  );
};
