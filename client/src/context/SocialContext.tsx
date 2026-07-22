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

  const processPresence = useCallback((p: any) => ({
    userId: p.userId || p.user_id,
    username: p.username,
    isOnline: true,
  }), []);

  useEffect(() => {
    if (!isConnected || !userId || !nakamaService.socket) return;

    const socket = nakamaService.socket;
    const myUserId = userId;
    const myUsername = username;
    let intervalId: ReturnType<typeof setInterval> | null = null;

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
          if (leaveId && leaveId !== myUserId) {
            nextUsers = nextUsers.filter((u) => u.userId !== leaveId);
          }
        });
        return nextUsers;
      });
    };

    const initSocial = async () => {
      try {
        const channel = await socket.joinChat("Lobby", 1, true, false);
        const chId = channel.id;
        setLobbyChannelId(chId);

        // Carga inicial de presencias
        const rawPresences = channel.presences || [];
        const presences = Array.isArray(rawPresences)
          ? rawPresences.map(processPresence)
          : Object.values(rawPresences).map(processPresence);

        const list = [...presences];
        if (myUserId && myUsername && !list.find((u) => u.userId === myUserId)) {
          list.push({ userId: myUserId, username: myUsername, isOnline: true });
        }
        setOnlineUsers(list);

        // Anunciar presencia al lobby
        const announce = () => {
          const displayName = localStorage.getItem("emu_display_name") || myUsername
          socket.writeChatMessage(chId, {
            _type: USER_PRESENCE_TYPE,
            senderId: myUserId,
            displayName,
            timestamp: Date.now(),
          }).catch(() => {});
        };
        announce();

        // Re-anunciar cada 5s
        intervalId = setInterval(announce, 5000);
      } catch (e) {
        console.error("Error al inicializar SocialContext:", e);
      }
    };

    initSocial();

    const handleNakamaMessage = (event: Event) => {
      const message = (event as CustomEvent).detail;
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;
        if (!content._type) {
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

        if (content._type === USER_PRESENCE_TYPE) {
          const sender = message.sender_id || content.senderId;
          if (sender === myUserId) return;
          const disp = content.displayName || content.username || message.username;
          setOnlineUsers((prev) => {
            const exist = prev.find((u) => u.userId === sender);
            if (exist) {
              if (exist.username !== disp) {
                return prev.map((u) => u.userId === sender ? { ...u, username: disp } : u);
              }
              return prev;
            }
            return [...prev, { userId: sender, username: disp, isOnline: true }];
          });
        }
      } catch {}
    };

    window.addEventListener("nakama_message", handleNakamaMessage);

    return () => {
      window.removeEventListener("nakama_message", handleNakamaMessage);
      if (intervalId) clearInterval(intervalId);
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
