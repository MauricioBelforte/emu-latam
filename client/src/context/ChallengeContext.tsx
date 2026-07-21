import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useSocial } from "./SocialContext";
import { nakamaService } from "../lib/nakama";
import { useGgpo } from "../ggpo/context/GgpoContext";

export type ChallengeStatus = "idle" | "picking_method" | "sent" | "received" | "accepted" | "rejected" | "timeout";

export interface ChallengeData {
  challengerId: string;
  challengerName: string;
  targetId: string;
  targetName: string;
  timestamp: number;
  method?: "tailscale" | "bore" | "lan";
}

export interface PendingTarget {
  userId: string;
  username: string;
}

interface ChallengeContextType {
  challengeStatus: ChallengeStatus;
  currentChallenge: ChallengeData | null;
  pendingTarget: PendingTarget | null;
  sendChallenge: (targetUserId: string, targetUsername: string, method: string) => void;
  initiateChallenge: (targetUserId: string, targetUsername: string) => void;
  selectMethod: (method: string) => void;
  cancelChallenge: () => void;
  cancelMethodPicker: () => void;
  acceptChallenge: () => void;
  rejectChallenge: () => void;
}

const ChallengeContext = createContext<ChallengeContextType>({} as ChallengeContextType);

export const useChallenge = () => useContext(ChallengeContext);

const CHALLENGE_MSG_TYPE = "challenge";
const CHALLENGE_ACCEPT_MSG_TYPE = "challenge_accept";
const CHALLENGE_REJECT_MSG_TYPE = "challenge_reject";
const CHALLENGE_CANCEL_MSG_TYPE = "challenge_cancel";
const CHALLENGE_GUEST_READY_MSG_TYPE = "challenge_guest_ready";
const CHALLENGE_TIMEOUT_MS = 30000;

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userId, username } = useAuth();
  const { channelId } = useSocial();
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeData | null>(null);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLaunchingRef = useRef(false);
  const { engine } = useGgpo();

  const resetChallenge = useCallback(() => {
    setChallengeStatus("idle");
    setCurrentChallenge(null);
    setPendingTarget(null);
    isLaunchingRef.current = false;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setChallengeStatus("timeout");
      setTimeout(() => resetChallenge(), 3000);
    }, CHALLENGE_TIMEOUT_MS);
  }, [resetChallenge]);

  const sendToLobby = useCallback(async (type: string, payload: Record<string, unknown>) => {
    if (!nakamaService.socket || !userId || !channelId) {
      console.warn("No se pudo enviar seal: Datos no listos.");
      return;
    }
    try {
      const messageContent = { _type: type, senderId: userId, ...payload };
      await nakamaService.socket.writeChatMessage(channelId, messageContent);
    } catch (err) {
      console.error("Error enviando", type, err);
    }
  }, [userId, channelId]);

  const initiateChallenge = useCallback((targetUserId: string, targetUsername: string) => {
    if (challengeStatus !== "idle") return;
    setPendingTarget({ userId: targetUserId, username: targetUsername });
    setChallengeStatus("picking_method");
  }, [challengeStatus]);

  const cancelMethodPicker = useCallback(() => {
    setPendingTarget(null);
    setChallengeStatus("idle");
  }, []);

  const selectMethod = useCallback((method: string) => {
    if (!userId || !username || !pendingTarget || challengeStatus !== "picking_method") return;
    const challenge: ChallengeData = {
      challengerId: userId,
      challengerName: username,
      targetId: pendingTarget.userId,
      targetName: pendingTarget.username,
      timestamp: Date.now(),
      method: method as "tailscale" | "bore" | "lan",
    };
    setCurrentChallenge(challenge);
    setChallengeStatus("sent");
    setPendingTarget(null);
    startTimeout();
    sendToLobby(CHALLENGE_MSG_TYPE, challenge);
  }, [userId, username, pendingTarget, challengeStatus, startTimeout, sendToLobby]);

  const sendChallenge = useCallback((targetUserId: string, targetUsername: string, method: string) => {
    if (!userId || !username || challengeStatus !== "idle") return;
    if (targetUserId === userId) return;
    const challenge: ChallengeData = {
      challengerId: userId, challengerName: username, targetId: targetUserId,
      targetName: targetUsername, timestamp: Date.now(), method: method as "tailscale" | "bore" | "lan",
    };
    setCurrentChallenge(challenge);
    setChallengeStatus("sent");
    startTimeout();
    sendToLobby(CHALLENGE_MSG_TYPE, challenge);
  }, [userId, username, challengeStatus, startTimeout, sendToLobby]);

  const cancelChallenge = useCallback(() => {
    if (currentChallenge && userId) {
      sendToLobby(CHALLENGE_CANCEL_MSG_TYPE, { challengerId: userId, targetId: currentChallenge.targetId });
    }
    resetChallenge();
  }, [currentChallenge, userId, sendToLobby, resetChallenge]);

  const acceptChallenge = useCallback(async () => {
    if (!currentChallenge || !userId || challengeStatus !== "received") return;
    const challengerId = currentChallenge.challengerId;
    setChallengeStatus("accepted");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE, { targetId: challengerId, acceptedBy: userId, acceptedByName: username });
  }, [currentChallenge, userId, challengeStatus, sendToLobby]);

  const rejectChallenge = useCallback(() => {
    if (!currentChallenge) return;
    sendToLobby(CHALLENGE_REJECT_MSG_TYPE, { targetId: currentChallenge.challengerId });
    setChallengeStatus("rejected");
    setTimeout(() => resetChallenge(), 2500);
  }, [currentChallenge, sendToLobby, resetChallenge]);

  // hostConnectionInfo stores the connection data we need to send to the guest
  const sendConnectionInfo = useCallback(async (targetId: string, data: Record<string, unknown>) => {
    await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE + "_conn", { targetId, ...data });
  }, [sendToLobby]);

  const METHOD_LABELS: Record<string, string> = { tailscale: "Tailscale (P2P)", bore: "Bore (Tnnel)", lan: "LAN Directo" };

  // --- EVENT LISTENER ---
  const handleNakamaMessageRef = useRef(async (_event: Event) => {});
  handleNakamaMessageRef.current = async (event: Event) => {
    const message = (event as CustomEvent).detail;
    try {
      const content = typeof message.content === "string" ? JSON.parse(message.content) : message.content;
      if (!content._type || content.senderId === userId) return;
      if (content.targetId !== userId) return;

      // 1. RECEIVE CHALLENGE
      if (content._type === CHALLENGE_MSG_TYPE) {
        if (challengeStatus !== "idle") return;
        setCurrentChallenge(content);
        setChallengeStatus("received");
        startTimeout();
        return;
      }

      // 2. CHALLENGE ACCEPTED (I'm the host/challenger)
      if (content._type === CHALLENGE_ACCEPT_MSG_TYPE) {
        if (isLaunchingRef.current) return;
        isLaunchingRef.current = true;
        setChallengeStatus("accepted");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const method = currentChallenge?.method || "bore";
        console.log(`Reto aceptado! Mtodo: ${method}`);

        try {
          await (window as any).electron.ipcRenderer.invoke("kill-retroarch");

          if (engine === "ggpo") {
            if (method === "bore") {
              alert("GGPO no es compatible con el túnel Bore. El reto se canceló.");
              resetChallenge();
              return;
            }
            const electron = (window as any).electron;
            const ipResult = method === "tailscale"
              ? await electron.ipcRenderer.invoke("get-tailscale-ip")
              : await electron.ipcRenderer.invoke("get-lan-ip");
            const myIp = ipResult.ip;
            if (!myIp) { alert("No se pudo detectar IP"); resetChallenge(); return; }
            await sendConnectionInfo(content.acceptedBy, { ggpoHostIp: myIp, hostName: username, useGgpo: true });
          } else if (method === "tailscale") {
            const result = await (window as any).electron.ipcRenderer.invoke("tailscale-host");
            if (!result.success) { alert("Error Tailscale: " + result.error); resetChallenge(); return; }
            await sendConnectionInfo(content.acceptedBy, { tailscaleIp: result.ip, hostName: username });
          } else if (method === "bore") {
            let tunnel = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
              tunnel = await (window as any).electron.ipcRenderer.invoke("start-relay-tunnel-v2");
              if (tunnel.success) break;
              await new Promise(r => setTimeout(r, 2000));
            }
            if (!tunnel.success) { alert("Error creando tnel: " + tunnel.error); resetChallenge(); return; }
            localStorage.setItem("emu_latam_relay", tunnel.url);
            await (window as any).electron.ipcRenderer.invoke("save-relay-url", tunnel.url);
            await (window as any).electron.ipcRenderer.invoke("launch-game", { isHost: true, useRelay: true, relayIp: tunnel.url });
            await sendConnectionInfo(content.acceptedBy, { boreUrl: tunnel.url, hostName: username });
          } else if (method === "lan") {
            const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", { useRelay: false, isHost: true });
            if (!gameResult.success) { alert("Error LAN: " + gameResult.error); resetChallenge(); return; }
            await sendConnectionInfo(content.acceptedBy, { lanIp: gameResult.myIp || "127.0.0.1", hostName: username });
          }
          setTimeout(() => resetChallenge(), 5000);
        } catch (e) {
          console.error("Error en flujo HOST:", e);
          resetChallenge();
        }
        return;
      }

      // 2b. RECEIVE CONNECTION INFO (I'm the guest)
      if (content._type === CHALLENGE_ACCEPT_MSG_TYPE + "_conn") {
        const method = currentChallenge?.method || "bore";

        try {
          if (content.useGgpo) {
            const hostIp = content.ggpoHostIp;
            if (!hostIp) { alert("Error: IP del host no recibida para GGPO"); resetChallenge(); return; }
            const electron = (window as any).electron;
            const method = currentChallenge?.method || "lan";
            const ipResult = method === "tailscale"
              ? await electron.ipcRenderer.invoke("get-tailscale-ip")
              : await electron.ipcRenderer.invoke("get-lan-ip");
            const guestIp = ipResult.ip;
            if (!guestIp) { alert("Error: no se pudo detectar IP propia"); resetChallenge(); return; }
            await electron.ipcRenderer.invoke("ggpo-launch", {
              rom: "kof98", localPort: 6004, remoteIp: hostIp, remotePort: 6003, playerNumber: 1,
            });
            await sendToLobby(CHALLENGE_GUEST_READY_MSG_TYPE, { targetId: content.senderId, guestIp });
          } else if (method === "tailscale" && content.tailscaleIp) {
            const result = await (window as any).electron.ipcRenderer.invoke("tailscale-guest", { hostIp: content.tailscaleIp });
            if (!result.success) alert("Error Tailscale guest: " + result.error);
          } else if (method === "bore" && content.boreUrl) {
            localStorage.setItem("emu_latam_relay", content.boreUrl);
            await (window as any).electron.ipcRenderer.invoke("save-relay-url", content.boreUrl);
            await (window as any).electron.ipcRenderer.invoke("launch-game", { isHost: false, useRelay: true, relayIp: content.boreUrl });
          } else if (method === "lan" && content.lanIp) {
            await (window as any).electron.ipcRenderer.invoke("launch-game", { useRelay: false, isHost: false, directConnectIp: content.lanIp });
          }
          setTimeout(() => resetChallenge(), 5000);
        } catch (e) {
          console.error("Error en flujo CLIENT:", e);
          resetChallenge();
        }
        return;
      }

      // 2c. GUEST READY (host receives guest's IP, launches GGPO)
      if (content._type === CHALLENGE_GUEST_READY_MSG_TYPE && engine === "ggpo") {
        const guestIp = content.guestIp;
        if (!guestIp) return;
        try {
          const electron = (window as any).electron;
          await electron.ipcRenderer.invoke("ggpo-launch", {
            rom: "kof98", localPort: 6003, remoteIp: guestIp, remotePort: 6004, playerNumber: 0,
          });
        } catch (e) {
          console.error("Error lanzando GGPO host:", e);
        }
        setTimeout(() => resetChallenge(), 5000);
        return;
      }

      // 3. REJECTED / CANCELLED
      if (content._type === CHALLENGE_REJECT_MSG_TYPE || content._type === CHALLENGE_CANCEL_MSG_TYPE) {
        if (content._type === CHALLENGE_REJECT_MSG_TYPE) setChallengeStatus("rejected");
        else resetChallenge();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (content._type === CHALLENGE_REJECT_MSG_TYPE) setTimeout(() => resetChallenge(), 2500);
      }
    } catch {}
  };

  useEffect(() => {
    const handler = (event: Event) => { handleNakamaMessageRef.current(event); };
    window.addEventListener("nakama_message", handler);
    return () => window.removeEventListener("nakama_message", handler);
  }, []);

  return (
    <ChallengeContext.Provider value={{
      challengeStatus, currentChallenge, pendingTarget,
      sendChallenge, initiateChallenge, selectMethod,
      cancelChallenge, cancelMethodPicker, acceptChallenge, rejectChallenge,
      resetChallenge,
    }}>
      {children}
    </ChallengeContext.Provider>
  );
};
