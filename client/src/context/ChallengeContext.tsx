import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useSocial } from "./SocialContext";
import { nakamaService } from "../lib/nakama";

// --- Tipos ---

export type ChallengeStatus =
  | "idle" // Sin reto activo
  | "sent" // Reto enviado, esperando respuesta
  | "received" // Reto recibido, esperando decisión del usuario
  | "accepted" // Reto aceptado por ambos
  | "rejected" // Reto rechazado
  | "timeout"; // Reto expirado

export interface ChallengeData {
  challengerId: string;
  challengerName: string;
  targetId: string;
  targetName: string;
  timestamp: number;
}

interface ChallengeContextType {
  challengeStatus: ChallengeStatus;
  currentChallenge: ChallengeData | null;
  sendChallenge: (targetUserId: string, targetUsername: string) => void;
  cancelChallenge: () => void;
  acceptChallenge: () => void;
  rejectChallenge: () => void;
}

const ChallengeContext = createContext<ChallengeContextType>({
  challengeStatus: "idle",
  currentChallenge: null,
  sendChallenge: () => {},
  cancelChallenge: () => {},
  acceptChallenge: () => {},
  rejectChallenge: () => {},
});

export const useChallenge = () => useContext(ChallengeContext);

// --- Tipos de Mensajes ---
const CHALLENGE_MSG_TYPE = "challenge";
const CHALLENGE_ACCEPT_MSG_TYPE = "challenge_accept";
const CHALLENGE_REJECT_MSG_TYPE = "challenge_reject";
const CHALLENGE_CANCEL_MSG_TYPE = "challenge_cancel";

const CHALLENGE_TIMEOUT_MS = 30000;

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userId, username, isConnected } = useAuth();
  const [challengeStatus, setChallengeStatus] =
    useState<ChallengeStatus>("idle");
  const [currentChallenge, setCurrentChallenge] =
    useState<ChallengeData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetChallenge = useCallback(() => {
    setChallengeStatus("idle");
    setCurrentChallenge(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.log("⏰ Reto expirado por timeout");
      setChallengeStatus("timeout");
      setTimeout(() => resetChallenge(), 3000);
    }, CHALLENGE_TIMEOUT_MS);
  }, [resetChallenge]);

  // --- Sistema de Envío de Mensajes a Recipiente Específico ---
  const sendToUser = useCallback(
    async (recipientId: string, type: string, payload: any) => {
      if (!nakamaService.socket || !userId) return;
      const socket = nakamaService.socket;

      try {
        const messageContent = {
          _type: type,
          senderId: userId,
          ...payload,
        };

        console.log(`📡 Enviando ${type} a ${recipientId}...`);
        const dmChannel = await socket.joinChat(recipientId, 2, false, false);
        await socket.writeChatMessage(dmChannel.id, messageContent);
      } catch (e) {
        console.error(`Error enviando ${type}:`, e);
      }
    },
    [userId],
  );

  // --- Acciones del Retador (A) ---

  const sendChallenge = useCallback(
    (targetId: string, targetName: string) => {
      if (!userId || !username || challengeStatus !== "idle") return;

      const challenge: ChallengeData = {
        challengerId: userId,
        challengerName: username,
        targetId: targetId,
        targetName: targetName,
        timestamp: Date.now(),
      };

      setCurrentChallenge(challenge);
      setChallengeStatus("sent");
      startTimeout();

      sendToUser(targetId, CHALLENGE_MSG_TYPE, challenge);
      console.log(`⚔️ Reto enviado a ${targetName}`);
    },
    [userId, username, challengeStatus, startTimeout, sendToUser],
  );

  const cancelChallenge = useCallback(() => {
    if (currentChallenge && userId) {
      sendToUser(currentChallenge.targetId, CHALLENGE_CANCEL_MSG_TYPE, {
        challengerId: userId,
      });
    }
    resetChallenge();
  }, [currentChallenge, userId, sendToUser, resetChallenge]);

  // --- Acciones del Retado (B) ---

  const acceptChallenge = useCallback(() => {
    if (!currentChallenge || !userId) return;

    const challengerId = currentChallenge.challengerId;

    // Notificar al retador que aceptamos
    sendToUser(challengerId, CHALLENGE_ACCEPT_MSG_TYPE, {
      targetId: userId, // Yo (B) acepté
      targetName: username || "Tu oponente",
    });

    setChallengeStatus("accepted");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    console.log("✅ Reto aceptado! Iniciando emulador...");

    setTimeout(async () => {
      try {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke("launch-game", {
          rom: "kof98",
        });
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => resetChallenge(), 2000);
    }, 1500);
  }, [currentChallenge, userId, username, sendToUser, resetChallenge]);

  const rejectChallenge = useCallback(() => {
    if (!currentChallenge) return;

    sendToUser(currentChallenge.challengerId, CHALLENGE_REJECT_MSG_TYPE, {
      targetId: userId,
    });

    setChallengeStatus("rejected");
    setTimeout(() => resetChallenge(), 2500);
  }, [currentChallenge, userId, sendToUser, resetChallenge]);

  // --- Listener de Socket ---
  useEffect(() => {
    if (!isConnected || !nakamaService.socket || !userId) return;

    const socket = nakamaService.socket;
    // Guardamos el handler por si hay otros
    const originalHandler = socket.onchannelmessage;

    socket.onchannelmessage = (message) => {
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;

        if (!content._type) {
          if (originalHandler) originalHandler(message);
          return;
        }

        console.log(`📩 Mensaje de sistema recibido: ${content._type}`);

        // 1. Recibimos un reto (Somos B)
        if (
          content._type === CHALLENGE_MSG_TYPE &&
          content.targetId === userId
        ) {
          if (challengeStatus !== "idle") return; // Ignorar si ya estamos en algo

          setCurrentChallenge(content);
          setChallengeStatus("received");
          startTimeout();
          return;
        }

        // 2. El otro aceptó el reto (Somos A)
        // IMPORTANTE: Solo procesamos si el que envía NO soy yo (evita el 3er emulador)
        if (
          content._type === CHALLENGE_ACCEPT_MSG_TYPE &&
          content.senderId === currentChallenge?.targetId &&
          content.senderId !== userId
        ) {
          console.log("🔥 ¡Reto aceptado por el oponente!");
          setChallengeStatus("accepted");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          setTimeout(async () => {
            try {
              // @ts-ignore
              await window.electron.ipcRenderer.invoke("launch-game", {
                rom: "kof98",
              });
            } catch (e) {
              console.error(e);
            }
            setTimeout(() => resetChallenge(), 2000);
          }, 1500);
          return;
        }

        // 3. El otro rechazó el reto
        if (
          content._type === CHALLENGE_REJECT_MSG_TYPE &&
          content.senderId === currentChallenge?.targetId
        ) {
          setChallengeStatus("rejected");
          setTimeout(() => resetChallenge(), 2500);
          return;
        }

        // 4. El otro canceló el reto
        if (
          content._type === CHALLENGE_CANCEL_MSG_TYPE &&
          content.senderId === currentChallenge?.challengerId
        ) {
          resetChallenge();
          return;
        }
      } catch (e) {
        if (originalHandler) originalHandler(message);
      }
    };

    return () => {
      socket.onchannelmessage = originalHandler;
    };
  }, [
    isConnected,
    userId,
    username,
    challengeStatus,
    currentChallenge,
    startTimeout,
    resetChallenge,
  ]);

  return (
    <ChallengeContext.Provider
      value={{
        challengeStatus,
        currentChallenge,
        sendChallenge,
        cancelChallenge,
        acceptChallenge,
        rejectChallenge,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
};
