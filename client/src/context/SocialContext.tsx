import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { nakamaService } from "../lib/nakama";

export interface UserPresence {
  userId: string;
  username: string;
  isOnline: boolean;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  username: string;
  content: string;
  timestamp: number;
}

interface SocialContextType {
  onlineUsers: UserPresence[];
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  channelId: string | null;
}

export const SocialContext = createContext<SocialContextType>({
  onlineUsers: [],
  messages: [],
  sendMessage: async () => {},
  channelId: null,
});

export const useSocial = () => useContext(SocialContext);

const USER_PRESENCE_TYPE = "emu_user_online";

export const SocialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userId, username, isConnected } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lobbyChannelId, setLobbyChannelId] = useState<string | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processPresence = useCallback((p: any) => ({
    userId: p.userId || p.user_id,
    username: p.username,
    isOnline: true,
  }), []);

  useEffect(() => {
    if (!isConnected || !userId || !nakamaService.socket) return;

    const socket = nakamaService.socket;

    // Setear handler ANTES de joinChat
    socket.onchannelpresence = (presence) => {
      setOnlineUsers((prev) => {
        let nextUsers = [...prev];
        presence.joins?.forEach((join: any) => {
          const uid = join.userId || join.user_id;
          if (uid && !nextUsers.find((u) => u.userId === uid)) {
            nextUsers.push(processPresence(join));
          }
        });
        presence.leaves?.forEach((leave: any) => {
          const leaveId = leave.userId || leave.user_id;
          if (leaveId && leaveId !== userId) {
            nextUsers = nextUsers.filter((u) => u.userId !== leaveId);
          }
        });
        return nextUsers;
      });
    };

    const initSocial = async () => {
      try {
        console.log("🎮 Uniéndose al Lobby Global...");
        const channel = await socket.joinChat("Lobby", 1, true, false);
        setLobbyChannelId(channel.id);

        // Carga inicial de presencias
        const rawPresences = channel.presences || [];
        const presences = Array.isArray(rawPresences)
          ? rawPresences.map(processPresence)
          : Object.values(rawPresences).map(processPresence);

        const list = [...presences];
        if (userId && username && !list.find((u) => u.userId === userId)) {
          list.push({ userId, username, isOnline: true });
        }
        console.log("[SOCIAL] Presencias iniciales:", list.length, "usuarios");
        setOnlineUsers(list);

        // Anunciar presencia al lobby (para que otros nos vean aunque presence events fallen)
        await socket.writeChatMessage(channel.id, {
          _type: USER_PRESENCE_TYPE,
          senderId: userId,
          username,
          timestamp: Date.now(),
        }).catch(() => {});
      } catch (e) {
        console.error("Error al inicializar SocialContext:", e);
      }
    };

    initSocial();

    // ESCUCHA DE MENSAJES (incluye presencia vía lobby messages)
    const handleNakamaMessage = (event: Event) => {
      const message = (event as CustomEvent).detail;
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;
        if (!content._type) {
          // Mensaje de chat normal
          const chatMsg: ChatMessage = {
            messageId: message.message_id,
            senderId: message.sender_id,
            username: message.username,
            content: content.text || "",
            timestamp: message.create_time
              ? new Date(message.create_time).getTime()
              : Date.now(),
          };
          setMessages((prev) => [...prev, chatMsg]);
          return;
        }

        // Mensaje de presencia vía lobby
        if (content._type === USER_PRESENCE_TYPE) {
          const sender = message.sender_id || content.senderId;
          if (sender === userId) return;
          setOnlineUsers((prev) => {
            if (prev.find((u) => u.userId === sender)) return prev;
            return [...prev, { userId: sender, username: content.username, isOnline: true }];
          });
        }
      } catch {}
    };

    window.addEventListener("nakama_message", handleNakamaMessage);

    // Re-anunciar presencia periódicamente
    presenceTimerRef.current = setInterval(() => {
      const ch = lobbyChannelId;
      if (!ch || !socket) return;
      socket.writeChatMessage(ch, {
        _type: USER_PRESENCE_TYPE,
        senderId: userId,
        username,
        timestamp: Date.now(),
      }).catch(() => {});
    }, 10000);

    return () => {
      window.removeEventListener("nakama_message", handleNakamaMessage);
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      setOnlineUsers([]);
    };
  }, [isConnected, userId, username, processPresence]);

  const sendMessage = useCallback(async (text: string) => {
    if (!lobbyChannelId || !nakamaService.socket) return;
    try {
      await nakamaService.socket.writeChatMessage(lobbyChannelId, { text });
    } catch (e) {
      console.error("Error enviando mensaje:", e);
    }
  }, [lobbyChannelId]);

  return (
    <SocialContext.Provider
      value={{
        onlineUsers,
        messages,
        sendMessage,
        channelId: lobbyChannelId,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};
