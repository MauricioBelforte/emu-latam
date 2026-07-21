import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { nakamaService } from "../lib/nakama";

const RECONNECT_MAX_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 3000;

interface AuthContextType {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  loginGhost: () => Promise<void>;
  logout: () => void;
  updateDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null, username: null, isAuthenticated: false, isConnected: false, loginGhost: async () => {}, logout: () => {}, updateDisplayName: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const isConnecting = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttempts.current = 0;
  }, []);

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

  const loginGhost = useCallback(async () => {
    if (isConnecting.current) return;
    try {
      isConnecting.current = true;
      const cfg = await (window as any).electron.ipcRenderer.invoke("get-nakama-server");
      console.log("[AUTH] Config recibida del main:", JSON.stringify(cfg));
      await nakamaService.configure(cfg.host, cfg.port);
      const session = await nakamaService.authenticateDevice();
      setUserId(session.user_id || null);
      const displayName = localStorage.getItem("emu_display_name");
      setUsername(displayName || session.username || null);
      setIsAuthenticated(true);
      const socket = await nakamaService.connectSocket();
      socket.ondisconnect = () => {
        setIsConnected(false);
        if (reconnectAttempts.current < RECONNECT_MAX_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(`[AUTH] Reintento ${reconnectAttempts.current}/${RECONNECT_MAX_ATTEMPTS} en ${RECONNECT_DELAY_MS}ms...`);
          reconnectTimerRef.current = setTimeout(() => loginGhost(), RECONNECT_DELAY_MS);
        }
      };
      setIsConnected(true);
      reconnectAttempts.current = 0;
    } catch (e) {
      console.warn("Nakama no disponible, usando modo local:", e);
      setUserId(`local-${crypto.randomUUID()}`);
      const saved = localStorage.getItem("emu_display_name");
      setUsername(saved || `Player ${Math.floor(Math.random() * 999) + 1}`);
      setIsAuthenticated(true);
      setIsConnected(false);
    } finally { isConnecting.current = false; }
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    localStorage.setItem("emu_display_name", name);
    setUsername(name);
  }, []);

  const logout = useCallback(() => {
    clearReconnect();
    setUserId(null);
    setUsername(null);
    setIsAuthenticated(false);
    setIsConnected(false);
    nakamaService.disconnect();
  }, [clearReconnect]);

  return (
    <AuthContext.Provider value={{ userId, username, isAuthenticated, isConnected, loginGhost, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};
