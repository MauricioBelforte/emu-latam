import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { nakamaService } from "../lib/nakama";

interface AuthContextType {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  loginGhost: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null, username: null, isAuthenticated: false, isConnected: false, loginGhost: async () => {}, logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const isConnecting = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      if (isConnecting.current) return;
      const restored = false;
      if (restored && nakamaService.session) {
        setUserId(nakamaService.session.user_id || null);
        setUsername(nakamaService.session.username || null);
        setIsAuthenticated(true);
        try {
          isConnecting.current = true;
          await nakamaService.connectSocket();
          setIsConnected(true);
        } catch { /* ignore */ } finally { isConnecting.current = false; }
      }
    };
    initAuth();
  }, []);

  const loginGhost = async () => {
    if (isConnecting.current) return;
    try {
      isConnecting.current = true;
      const cfg = await (window as any).electron.ipcRenderer.invoke("get-nakama-server");
      console.log("[AUTH] Config recibida del main:", JSON.stringify(cfg));
      await nakamaService.configure(cfg.host, cfg.port);
      const session = await nakamaService.authenticateDevice();
      setUserId(session.user_id || null);
      setUsername(session.username || null);
      setIsAuthenticated(true);
      const socket = await nakamaService.connectSocket();
      socket.ondisconnect = () => setIsConnected(false);
      setIsConnected(true);
    } catch (e) {
      console.warn("Nakama no disponible, usando modo local:", e);
      setUserId(`local-${crypto.randomUUID()}`);
      setUsername(`Player ${Math.floor(Math.random() * 999) + 1}`);
      setIsAuthenticated(true);
      setIsConnected(false);
    } finally { isConnecting.current = false; }
  };

  const logout = () => {
    setUserId(null);
    setUsername(null);
    setIsAuthenticated(false);
    setIsConnected(false);
    nakamaService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ userId, username, isAuthenticated, isConnected, loginGhost, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
