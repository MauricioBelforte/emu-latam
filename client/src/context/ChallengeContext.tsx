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
  | "idle"
  | "sent"
  | "received"
  | "accepted"
  | "rejected"
  | "timeout";

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

const CHALLENGE_MSG_TYPE = "challenge";
const CHALLENGE_ACCEPT_MSG_TYPE = "challenge_accept";
const CHALLENGE_REJECT_MSG_TYPE = "challenge_reject";
const CHALLENGE_CANCEL_MSG_TYPE = "challenge_cancel";
const CHALLENGE_TIMEOUT_MS = 30000;

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userId, username } = useAuth();
  const { channelId } = useSocial();
  const [challengeStatus, setChallengeStatus] =
    useState<ChallengeStatus>("idle");
  const [currentChallenge, setCurrentChallenge] =
    useState<ChallengeData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLaunchingRef = useRef(false); // Evitar doble lanzamiento

  const resetChallenge = useCallback(() => {
    setChallengeStatus("idle");
    setCurrentChallenge(null);
    isLaunchingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setChallengeStatus("timeout");
      setTimeout(() => resetChallenge(), 3000);
    }, CHALLENGE_TIMEOUT_MS);
  }, [resetChallenge]);

  const sendToLobby = useCallback(
    async (type: string, payload: Record<string, unknown>) => {
      if (!nakamaService.socket || !userId || !channelId) {
        console.warn("⚠️ No se pudo enviar señal: Datos no listos.");
        return;
      }
      try {
        const messageContent = { _type: type, senderId: userId, ...payload };
        console.log(`📡 Difundiendo señal: ${type}`);
        await nakamaService.socket.writeChatMessage(channelId, messageContent);
      } catch (err) {
        console.error(`Error enviando ${type}:`, err);
      }
    },
    [userId, channelId],
  );

  const sendChallenge = useCallback(
    (targetId: string, targetName: string) => {
      if (!userId || !username || challengeStatus !== "idle") return;
      if (targetId === userId) return; // PROHIBIDO: Auto-reto

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
      sendToLobby(CHALLENGE_MSG_TYPE, challenge);
    },
    [userId, username, challengeStatus, startTimeout, sendToLobby],
  );

  const cancelChallenge = useCallback(() => {
    if (currentChallenge && userId) {
      sendToLobby(CHALLENGE_CANCEL_MSG_TYPE, {
        challengerId: userId,
        targetId: currentChallenge.targetId,
      });
    }
    resetChallenge();
  }, [currentChallenge, userId, sendToLobby, resetChallenge]);

  const acceptChallenge = useCallback(async () => {
    if (!currentChallenge || !userId || isLaunchingRef.current) return;
    isLaunchingRef.current = true;

    const challengerId = currentChallenge.challengerId;
    setChallengeStatus("accepted");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    console.log("✅ RETO ACEPTADO - Esperando bore URL del Challenger...");

    try {
      // Notificamos al retador que aceptamos. Él creará el túnel bore.
      await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE, {
        targetId: challengerId,
        acceptedBy: userId,
        acceptedByName: username,
      });
    } catch (e) {
      console.error("Error notificando aceptación:", e);
    }

    // No lanzamos nada aquí. El challenger (HOST) crea el túnel y nos avisa.
  }, [currentChallenge, userId, username, sendToLobby]);

  const rejectChallenge = useCallback(() => {
    if (!currentChallenge) return;
    sendToLobby(CHALLENGE_REJECT_MSG_TYPE, {
      targetId: currentChallenge.challengerId,
    });
    setChallengeStatus("rejected");
    setTimeout(() => resetChallenge(), 2500);
  }, [currentChallenge, sendToLobby, resetChallenge]);

  // --- ESCUCHA DE EVENTOS GLOBAL ---
  useEffect(() => {
    const handleNakamaMessage = async (event: Event) => {
      const message = (event as CustomEvent).detail;
      try {
        const content =
          typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;

        // --- FILTROS DE SEGURIDAD ---
        if (!content._type || content.senderId === userId) return;
        const isForMe = content.targetId === userId;
        if (!isForMe) return;

        console.log(`📦 Señal recibida del Lobby: ${content._type}`);

        // 1. Recibimos un reto (Somos B)
        if (content._type === CHALLENGE_MSG_TYPE) {
          if (challengeStatus !== "idle") return;
          setCurrentChallenge(content);
          setChallengeStatus("received");
          startTimeout();
          return;
        }

        // 2. El otro aceptó el reto (Somos A = Challenger = HOST)
        if (content._type === CHALLENGE_ACCEPT_MSG_TYPE) {
          if (isLaunchingRef.current) return;
          isLaunchingRef.current = true;

          setChallengeStatus("accepted");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          console.log(
            `🔥 ¡Reto aceptado por ${content.acceptedByName}! Creando túnel bore...`,
          );

          try {
            // 1. Crear túnel bore (Host = Challenger)
            // @ts-expect-error - IPC bridge types
            const tunnel = await window.electron.ipcRenderer.invoke("start-relay-tunnel");

            if (!tunnel.success) {
              console.error("❌ Error creando túnel:", tunnel.error);
              alert("Error al crear túnel: " + tunnel.error);
              resetChallenge();
              return;
            }

            const boreUrl = tunnel.url;
            console.log(`✅ Túnel bore listo: ${boreUrl}`);

            // 2. Guardar URL del relay
            localStorage.setItem("emu_latam_relay", boreUrl);
            // @ts-expect-error - IPC bridge types
            await window.electron.ipcRenderer.invoke("save-relay-url", boreUrl);

            // 3. Lanzar RetroArch como HOST
            // @ts-expect-error - IPC bridge types
            await window.electron.ipcRenderer.invoke("launch-game", {
              isHost: true,
              useRelay: true,
              relayIp: boreUrl,
            });

            // 4. Enviar la URL del bore al Target (B) para que se conecte
            await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE + "_bore_url", {
              targetId: content.acceptedBy,
              boreUrl: boreUrl,
              challengerName: username,
            });

            setTimeout(() => resetChallenge(), 5000);
          } catch (e) {
            console.error("Error en flujo HOST:", e);
            resetChallenge();
          }
          return;
        }

        // 2b. Recibimos la URL bore del Challenger (Somos B = Target = CLIENT)
        if (content._type === CHALLENGE_ACCEPT_MSG_TYPE + "_bore_url") {
          if (isLaunchingRef.current) return;
          isLaunchingRef.current = true;

          console.log(
            `🔥 ¡Recibido bore URL del Challenger: ${content.boreUrl}! Conectando...`,
          );

          try {
            // 1. Guardar URL del relay
            localStorage.setItem("emu_latam_relay", content.boreUrl);
            // @ts-expect-error - IPC bridge types
            await window.electron.ipcRenderer.invoke("save-relay-url", content.boreUrl);

            // 2. Lanzar RetroArch como CLIENT conectándose al bore del Host
            // @ts-expect-error - IPC bridge types
            await window.electron.ipcRenderer.invoke("launch-game", {
              isHost: false,
              useRelay: true,
              relayIp: content.boreUrl,
            });

            setTimeout(() => resetChallenge(), 5000);
          } catch (e) {
            console.error("Error en flujo CLIENT:", e);
            resetChallenge();
          }
          return;
        }

        // 3. El otro rechazó o canceló
        if (
          content._type === CHALLENGE_REJECT_MSG_TYPE ||
          content._type === CHALLENGE_CANCEL_MSG_TYPE
        ) {
          if (content._type === CHALLENGE_REJECT_MSG_TYPE)
            setChallengeStatus("rejected");
          else resetChallenge();
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (content._type === CHALLENGE_REJECT_MSG_TYPE)
            setTimeout(() => resetChallenge(), 2500);
          return;
        }
      } catch {
        // Si no es JSON valido, ignorar silenciosamente
      }
    };

    window.addEventListener("nakama_message", handleNakamaMessage);
    return () =>
      window.removeEventListener("nakama_message", handleNakamaMessage);
  }, [userId, challengeStatus, resetChallenge, startTimeout]);

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
