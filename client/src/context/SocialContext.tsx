import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { ChannelMessage, Presence } from "@heroiclabs/nakama-js";
import { nakamaService } from "../lib/nakama";

interface SocialContextType {
  onlineUsers: Presence[];
  messages: ChannelMessage[];
  sendMessage: (text: string) => Promise<void>;
}

export const SocialContext = createContext<SocialContextType>({
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

  // Use a ref to track if we're already initializing to avoid race conditions
  const isInitializing = useRef(false);

  useEffect(() => {
    // Only run if authenticated and connected, and if not already initializing
    if (
      isConnected &&
      isAuthenticated &&
      nakamaService.socket &&
      !isInitializing.current
    ) {
      const socket = nakamaService.socket;
      isInitializing.current = true;

      const runSocialinit = async () => {
        try {
          // Extra wait just in case to ensure SDK internal state is fully updated
          await new Promise((r) => setTimeout(r, 500));

          console.log("--- SocialContext: Inicializando canal lobby ---");

          // Update status globally
          await socket.updateStatus("Online");
          console.log("Status updated to Online");

          // 1. Join Global Lobby Channel (Type 1 = Room)
          const channel = await socket.joinChat(
            "Global_Lobby",
            1,
            false,
            false,
          );
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

          // Register event handlers
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

          socket.onchannelmessage = (message) => {
            setMessages((prev) => [...prev, message]);
          };
        } catch (e) {
          console.error("Error inicializando SocialContext:", e);
          // If it failed, allow retry in next cycle
          isInitializing.current = false;
        }
      };

      runSocialinit();

      return () => {
        // Not resetting isInitializing here as we don't want it to rerun unless connection state flips
      };
    }

    if (!isConnected) {
      // Reset if we lose connection
      isInitializing.current = false;
      setLobbyChannelId(null);
    }
  }, [isConnected, isAuthenticated]);

  const sendMessage = async (text: string) => {
    if (nakamaService.socket && lobbyChannelId) {
      try {
        await nakamaService.socket.writeChatMessage(lobbyChannelId, { text });
      } catch (e) {
        console.error("Error enviando mensaje:", e);
      }
    }
  };

  return (
    <SocialContext.Provider value={{ onlineUsers, messages, sendMessage }}>
      {children}
    </SocialContext.Provider>
  );
};
