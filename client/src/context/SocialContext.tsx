import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { ChannelMessage, Presence } from "@heroiclabs/nakama-js";
import { nakamaService } from "../lib/nakama";

interface SocialContextType {
  onlineUsers: Presence[];
  messages: ChannelMessage[];
  sendMessage: (text: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextType>({
  onlineUsers: [],
  messages: [],
  sendMessage: async () => {}, // placeholder
});

export const useSocial = () => useContext(SocialContext);

export const SocialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isConnected, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([]);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [lobbyChannelId, setLobbyChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && isAuthenticated && nakamaService.socket) {
      const socket = nakamaService.socket;

      // Update status globally
      socket
        .updateStatus("Online")
        .then(() => console.log("Status updated to Online"))
        .catch((e) => console.error("Failed to update status", e));

      // 1. Join Global Lobby Channel (Type 1 = Room)
      socket
        .joinChat("Global_Lobby", 1, false, false)
        .then((channel) => {
          console.log("¡Canal Global Lobby unido!", channel);
          setLobbyChannelId(channel.id);

          if (channel.presences) {
            setOnlineUsers(channel.presences);
          }

          if (channel.self) {
            setOnlineUsers((prev) => {
              if (!prev.find((u) => u.user_id === channel.self.user_id)) {
                return [...prev, channel.self];
              }
              return prev;
            });
          }
        })
        .catch((e) => console.error("Error al unirse al canal:", e));

      // Listen for presence changes
      socket.onchannelpresence = (presenceEvent) => {
        setOnlineUsers((currentUsers) => {
          let updatedUsers = [...currentUsers];
          if (presenceEvent.leaves) {
            presenceEvent.leaves.forEach((leftUser) => {
              updatedUsers = updatedUsers.filter(
                (u) => u.session_id !== leftUser.session_id,
              );
            });
          }
          if (presenceEvent.joins) {
            presenceEvent.joins.forEach((joinedUser) => {
              if (
                !updatedUsers.find(
                  (u) => u.session_id === joinedUser.session_id,
                )
              ) {
                updatedUsers.push(joinedUser);
              }
            });
          }
          return updatedUsers;
        });
      };

      // Listen for messages
      socket.onchannelmessage = (message) => {
        setMessages((prev) => [...prev, message]);
      };

      return () => {
        // Leave channel on unmount or disconnect
        if (nakamaService.socket) {
          // Note: we can't easily track lobbyChannelId across the closure update without a ref
          // but for now, disconnecting the socket usually cleans up server-side presence.
        }
      };
    }
  }, [isConnected, isAuthenticated]); // Removed lobbyChannelId from deps to avoid infinite loop

  const sendMessage = async (text: string) => {
    if (nakamaService.socket && lobbyChannelId) {
      await nakamaService.socket.writeChatMessage(lobbyChannelId, { text });
    }
  };

  return (
    <SocialContext.Provider value={{ onlineUsers, messages, sendMessage }}>
      {children}
    </SocialContext.Provider>
  );
};
