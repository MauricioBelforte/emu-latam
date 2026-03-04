import React, { createContext, useContext, useState, useEffect } from "react";
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

export const SocialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userId, username, isConnected } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lobbyChannelId, setLobbyChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !userId || !nakamaService.socket) return;

    const socket = nakamaService.socket;

    const initSocial = async () => {
      try {
        console.log("🎮 Uniéndose al Lobby Global...");
        const channel = await socket.joinChat("Lobby", 1, true, false);
        setLobbyChannelId(channel.id);

        // --- CARGA INICIAL DE USUARIOS ---
        const presences = Object.values(channel.presences || {}).map(
          (p: any) => ({
            userId: p.user_id,
            username: p.username,
            isOnline: true,
          }),
        );

        // --- ASEGURARNOS DE QUE NOSOTROS ESTAMOS EN LA LISTA ---
        const list = [...presences];
        if (userId && username && !list.find((u) => u.userId === userId)) {
          list.push({ userId, username, isOnline: true });
        }

        setOnlineUsers(list);
      } catch (e) {
        console.error("Error al inicializar SocialContext:", e);
      }
    };

    initSocial();

    // ESCUCHA DE MENSAJES
    const handleNakamaMessage = (event: Event) => {
      const message = (event as CustomEvent).detail;
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;
        if (content._type) return;

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
      } catch (e) {}
    };

    window.addEventListener("nakama_message", handleNakamaMessage);

    // GESTIÓN DE PRESENCIAS EN VIVO
    socket.onchannelpresence = (presence) => {
      setOnlineUsers((prev) => {
        let nextUsers = [...prev];

        presence.joins?.forEach((join: any) => {
          if (!nextUsers.find((u) => u.userId === join.user_id)) {
            nextUsers.push({
              userId: join.user_id,
              username: join.username,
              isOnline: true,
            });
          }
        });

        presence.leaves?.forEach((leave: any) => {
          if (leave.user_id !== userId) {
            // No nos borramos a nosotros mismos
            nextUsers = nextUsers.filter((u) => u.userId !== leave.user_id);
          }
        });

        return nextUsers;
      });
    };

    return () => {
      window.removeEventListener("nakama_message", handleNakamaMessage);
    };
  }, [isConnected, userId, username]);

  const sendMessage = async (text: string) => {
    if (!lobbyChannelId || !nakamaService.socket) return;
    try {
      await nakamaService.socket.writeChatMessage(lobbyChannelId, { text });
    } catch (e) {
      console.error("Error enviando mensaje:", e);
    }
  };

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
