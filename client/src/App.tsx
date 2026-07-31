import React, { useState, useEffect, useCallback, useRef } from "react";
import styled, { ThemeProvider, keyframes } from "styled-components";
import { useAuth } from "./context/AuthContext";
import { useChallenge } from "./context/ChallengeContext";
import { useSocial } from "./context/SocialContext";
import { useGgpo } from "./ggpo/context/GgpoContext";
import { GgpoToggle } from "./ggpo/components/GgpoToggle";
import { GgpoHostView } from "./ggpo/components/GgpoHostView";
import { GgpoGuestView } from "./ggpo/components/GgpoGuestView";
import { nakamaService } from "./lib/nakama";
import { theme } from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";
import { AppShell } from "./components/layout/AppShell";
import { ChallengeModal } from "./components/ui/ChallengeModal";
import { NetplayConfigModal } from "./components/ui/NetplayConfigModal";
import { NamePickerModal } from "./components/ui/NamePickerModal";
import { StatusProvider } from "./context/StatusContext";
import { ErrorBanner } from "./components/ErrorBanner";
import { ToastHost } from "./components/ToastHost";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const GameCard = styled.div`
  background: linear-gradient(135deg, ${(p) => p.theme.colors.surface} 0%, ${(p) => p.theme.colors.background} 100%);
  border: 2px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 40px;
  max-width: 860px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  margin: auto;
`;

const GameTitle = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 4px;
  text-align: center;
  color: #fff;
  font-family: ${(p) => p.theme.fonts.arcade};
  span { color: ${(p) => p.theme.colors.primary}; text-shadow: ${(p) => p.theme.shadows.neonPrimary}; }
`;

const DebugInfo = styled.p`
  color: ${(p) => p.theme.colors.accent};
  font-family: ${(p) => p.theme.fonts.arcade};
  font-size: 0.65rem;
  margin-bottom: 25px;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${(p) => p.theme.colors.border}, transparent);
  margin: 20px 0;
`;

const Section = styled.div<{ $accent?: string }>`
  width: 100%;
  border: 1px solid ${(p) => p.$accent || p.theme.colors.border};
  border-radius: 6px;
  padding: 15px;
  background: rgba(255,255,255,0.02);
  margin-bottom: 12px;
`;

const SectionHeader = styled.p<{ $color?: string }>`
  color: ${(p) => p.$color || p.theme.colors.textSecondary};
  font-family: monospace;
  font-size: 0.6rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span<{ $bg?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.55rem;
  background: ${(p) => p.$bg || "#333"};
  color: #000;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const FullRow = styled.div`
  width: 100%;
`;

const Btn = styled.button<{ $accent?: string; $bg?: string; $loading?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  letter-spacing: 1px;
  text-transform: uppercase;
  background: ${(p) => p.$bg || "transparent"};
  color: ${(p) => p.$accent || p.theme.colors.text};
  border: 2px solid ${(p) => p.$accent || p.theme.colors.border};
  cursor: pointer;
  transition: ${(p) => p.theme.transitions.default};

  &:hover:not(:disabled) {
    background: ${(p) => p.$accent || p.theme.colors.primary};
    color: #000;
    box-shadow: ${(p) => p.$accent ? `0 0 12px ${p.$accent}66` : "none"};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  animation: ${(p) => p.$loading ? pulse : "none"} 0.8s ease-in-out infinite;
`;

const Input = styled.input<{ $accent?: string }>`
  width: 100%;
  padding: 10px;
  background: #000;
  border: 1px solid ${(p) => p.$accent || "#555"};
  color: ${(p) => p.$accent || "#0f0"};
  font-family: monospace;
  font-size: 0.75rem;
  outline: none;
  transition: ${(p) => p.theme.transitions.default};
  &:focus { border-color: ${(p) => p.theme.colors.primary}; box-shadow: 0 0 8px ${(p) => p.theme.colors.primary}44; }
`;

const StatusText = styled.p<{ $color?: string }>`
  color: ${(p) => p.$color || p.theme.colors.accent};
  font-family: monospace;
  font-size: 0.65rem;
  margin-top: 6px;
  min-height: 14px;
`;

const InsertCoinButton = styled(Btn)`
  max-width: 360px;
  padding: 20px 40px;
  font-size: 1.2rem;
  border: 3px solid ${(p) => p.theme.colors.primary};
  color: ${(p) => p.theme.colors.primary};
  background: transparent;

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.primary};
    color: #000;
    box-shadow: ${(p) => p.theme.shadows.neonPrimary};
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const SalaButton = styled(Btn)<{ $active?: boolean }>`
  padding: 18px 20px;
  font-size: 0.85rem;
`;

const ToggleBtn = styled(Btn)<{ $isOpen?: boolean }>`
  width: 100%;
  padding: 10px;
  font-size: 0.65rem;
  font-family: ${(p) => p.theme.fonts.arcade};
  letter-spacing: 1px;
  text-transform: uppercase;
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px dashed ${(p) => p.theme.colors.border};
  cursor: pointer;
  transition: ${(p) => p.theme.transitions.default};
  margin-bottom: 12px;
  &:hover {
    background: rgba(255,255,255,0.03);
    color: #fff;
    border-color: #555;
  }
`;

const Collapsible = styled.div<{ $open: boolean }>`
  overflow: hidden;
  max-height: ${(p) => (p.$open ? "2000px" : "0")};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transition: max-height 0.4s ease, opacity 0.3s ease;
`;

const inline = {
  flex: { display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
  flexCol: { display: "flex", flexDirection: "column" as const },
};

function App() {
  const { loginGhost, logout, isAuthenticated, username, isConnected, userId, updateDisplayName } = useAuth();
  const { onlineUsers } = useSocial();
  const { initiateChallenge } = useChallenge();
  const [loading, setLoading] = useState({ bore: false, mitm: false, tsHost: false, tsJoin: false, directJoin: false });
  const [directHostIp, setDirectHostIp] = useState("");
  const [tailscaleHostIp, setTailscaleHostIp] = useState("");
  const [myTailscaleIp, setMyTailscaleIp] = useState("");
  const [tsStatus, setTsStatus] = useState("");
  const [customRelay, setCustomRelay] = useState("");
  const [statusText, setStatusText] = useState("");
  const [nakamaReady, setNakamaReady] = useState(false);
  const [nakamaHost, setNakamaHost] = useState("127.0.0.1");
  const [nakamaPort, setNakamaPort] = useState("7350");
  const [joinMode, setJoinMode] = useState<"create" | "join" | null>(null);
  const [isP2pSala, setIsP2pSala] = useState(false);
  const [isBootstrapSala, setIsBootstrapSala] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [peerReachable, setPeerReachable] = useState<boolean | null>(null);
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [showAltMethods, setShowAltMethods] = useState(false);
  const [showNetplayConfig, setShowNetplayConfig] = useState(false);
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveryDoneRef = useRef(false);
  const { engine, status: ggpoStatus, cancelHosting, startHosting, joinRoom } = useGgpo();
  const [ggpoIp, setGgpoIp] = useState("");
  const [p2pStatus, setP2pStatus] = useState("");
  const [p2pAutoCandidate, setP2pAutoCandidate] = useState<any | null>(null);
  const [p2pHostCandidate, setP2pHostCandidate] = useState<any | null>(null);
  const [p2pGuestReady, setP2pGuestReady] = useState(false);
  const [loadingP2p, setLoadingP2p] = useState({ host: false, guest: false });
  const p2pDiscoveryRef = useRef(false);
  const [bootstrapStatus, setBootstrapStatus] = useState("");
  const [bootstrapRoomCode, setBootstrapRoomCode] = useState("");
  const [bootstrapBoreUrl, setBootstrapBoreUrl] = useState("");
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapRoomInput, setBootstrapRoomInput] = useState("");
  const [bootstrapLanIp, setBootstrapLanIp] = useState("");
  const [bootstrapGuestLanIp, setBootstrapGuestLanIp] = useState("");
  const [p2pWanHostPublic, setP2pWanHostPublic] = useState("");
  const [p2pWanLanAddr, setP2pWanLanAddr] = useState("");
  const [p2pWanUpnp, setP2pWanUpnp] = useState<boolean | null>(null);
  const [p2pWanGuestInput, setP2pWanGuestInput] = useState("");
  const [p2pWanStatus, setP2pWanStatus] = useState("");
  const [loadingP2pWan, setLoadingP2pWan] = useState(false);

  useEffect(() => {
    const electron = (window as any).electron;
    if (electron?.onError) {
      electron.onError((data: any) => setErrorMsg(data.message || "Error desconocido"));
    }
  }, []);

  useEffect(() => {
    (window as any).__BOOTSTRAP_ACTIVE__ = isBootstrapSala;
  }, [isBootstrapSala]);

  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem("emu_display_name")) {
      setShowNamePicker(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) setJoinMode(null);
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await (window as any).electron.ipcRenderer.invoke("get-nakama-server");
      if (active) { setNakamaHost(cfg.host); setNakamaPort(cfg.port); }
    })();
    const check = async () => {
      while (active) {
        try {
          const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
          if (active) setNakamaReady(ok);
        } catch { if (active) setNakamaReady(false); }
        await new Promise(r => setTimeout(r, 3000));
      }
    };
    check();
    return () => { active = false; };
  }, []);

  const handleSaveNakamaServer = async () => {
    await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: nakamaHost, port: nakamaPort });
    const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
    setNakamaReady(ok);
    if (ok) alert(`Conectado a Nakama en ${nakamaHost}:${nakamaPort}`);
    else alert("No se pudo conectar al servidor Nakama. Verificá la IP y puerto.");
  };

  const handleSaveRelay = () => {
    localStorage.setItem("emu_latam_relay", customRelay);
    alert("Configuración de Relay guardada!");
  };

  const handleInsertCoin = async () => {
    console.log("INSERT COIN CLICKED");
    await loginGhost();
    const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
    if (ts.ip) setMyTailscaleIp(ts.ip);
  };

  const isHostingSala = isAuthenticated && (nakamaHost === "127.0.0.1" || nakamaHost === "localhost");

  const handleTestGame = async (isHost: boolean) => {
    let finalRelayIp = customRelay;
    try {
      if (isHost) {
        setLoading(p => ({ ...p, bore: true }));
        setStatusText("Iniciando túnel Bore...");
        const result = await (window as any).electron.ipcRenderer.invoke("start-relay-tunnel");
        if (result.success) {
          finalRelayIp = result.url;
          setCustomRelay(result.url);
          localStorage.setItem("emu_latam_relay", result.url);
          await (window as any).electron.ipcRenderer.invoke("save-relay-url", result.url);
        } else {
          alert("Error al iniciar túnel: " + result.error);
          setLoading(p => ({ ...p, bore: false }));
          return;
        }
        setLoading(p => ({ ...p, bore: false }));
      } else {
        let relayFromFile = null;
        for (let i = 0; i < 20; i++) {
          relayFromFile = await (window as any).electron.ipcRenderer.invoke("get-relay-url");
          if (relayFromFile) break;
          console.log(`⏳ Esperando URL del Host... (intento ${i + 1})`);
          await new Promise(r => setTimeout(r, 500));
        }
        if (relayFromFile) {
          finalRelayIp = relayFromFile;
          setCustomRelay(relayFromFile);
          localStorage.setItem("emu_latam_relay", relayFromFile);
        } else {
          alert("No se encontró la URL del Host. ¿Ejecutaste HOST GAME primero?");
          return;
        }
      }
      setStatusText("Iniciando RetroArch...");
      const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
        useRelay: true, isHost: isHost, relayIp: finalRelayIp, relayUrl: isHost ? finalRelayIp : undefined,
      });
      if (!gameResult || !gameResult.success) alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
      setStatusText("");
    } catch (e) {
      console.error("Error:", e);
      setLoading(p => ({ ...p, bore: false }));
      setStatusText("");
      alert("Error: Asegúrate de tener el emulador configurado.");
    }
  };

  const handleDirectHost = async () => {
    setStatusText("Iniciando RetroArch directo...");
    const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
      useRelay: false, isHost: true,
    });
    if (!gameResult || !gameResult.success) {
      alert("Error al ejecutar juego: " + (gameResult?.error || "desconocido"));
    } else {
      await (window as any).electron.ipcRenderer.invoke("save-relay-url", "127.0.0.1:55435");
    }
    setStatusText("");
  };

  const handleDirectJoin = async () => {
    if (!directHostIp) { alert("Ingresá la IP del host primero"); return; }
    setLoading(p => ({ ...p, directJoin: true }));
    setStatusText("Conectando a host directo...");
    const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
      useRelay: false, isHost: false, directConnectIp: directHostIp,
    });
    if (!gameResult || !gameResult.success) {
      alert("Error al conectar: " + (gameResult?.error || "desconocido"));
    }
    setLoading(p => ({ ...p, directJoin: false }));
    setStatusText("");
  };

  const handleTestMitmLocal = async () => {
    if (loading.mitm) return;
    setLoading(p => ({ ...p, mitm: true }));
    setStatusText("Iniciando relay MITM local...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("start-mitm-local");
      if (!result.success && result.error?.includes("ya está en ejecución")) {
        console.warn("MITM ya en ejecución, ignorando click doble");
      } else if (!result.success) {
        alert("Error MITM local: " + (result.error || "desconocido"));
      }
    } catch (e) {
      console.error("Error MITM:", e);
      alert("Error al iniciar MITM local");
    }
    setLoading(p => ({ ...p, mitm: false }));
    setStatusText("");
  };

  const handleP2pHost = async () => {
    setLoadingP2p(p => ({ ...p, host: true }));
    setP2pStatus("Iniciando host P2P...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("p2p-host");
      if (result.success) {
        setP2pHostCandidate(result.candidate);
        await nakamaService.publishP2pCandidate(result.candidate);
        setP2pStatus(`Host P2P listo. Iniciando RetroArch...`);
        const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
          useRelay: false, isHost: true,
        });
        if (!gameResult?.success) setP2pStatus("Error al lanzar RetroArch: " + (gameResult?.error || "desconocido"));
        else setP2pStatus("✅ Host P2P activo — Esperando guest...");
      } else {
        setP2pStatus(`Error: ${result.error}`);
      }
    } catch (e) {
      console.error("P2P host error:", e);
      setP2pStatus("Error al iniciar host P2P");
    }
    setLoadingP2p(p => ({ ...p, host: false }));
  };

  const handleP2pGuest = async () => {
    let hostCand = p2pAutoCandidate || p2pHostCandidate;

    // Si no hay candidate auto-detectado, buscar activamente en Nakama
    if (!hostCand && isAuthenticated && onlineUsers.length > 0) {
      for (let i = 0; i < 10; i++) {
        for (const user of onlineUsers) {
          if (user.userId === userId) continue;
          const cand = await nakamaService.fetchP2pCandidate(user.userId);
          if (cand && cand.publicIp) {
            cand.userId = user.userId;
            hostCand = cand;
            p2pDiscoveryRef.current = true;
            setP2pAutoCandidate(cand);
            break;
          }
        }
        if (hostCand) break;
        setP2pStatus(`Buscando host P2P en Nakama... (${i + 1}/10)`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!hostCand) {
      setP2pStatus("No se encontró host P2P. Apretá HOST P2P en la otra PC primero.");
      return;
    }

    setLoadingP2p(p => ({ ...p, guest: true }));
    setP2pStatus("Conectando al host P2P...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("p2p-guest", { hostCandidate: hostCand });
      if (result.success) {
        // LAN mode: conexión directa, sin P2P ni forwarder
        if (result.isLan) {
          setP2pStatus("Modo LAN detectado. Conectando directo...");
          const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
            useRelay: false, isHost: false, directConnectIp: result.hostLanIp,
            connectPort: 55435,
          });
          if (!gameResult?.success) setP2pStatus("Error al lanzar RetroArch: " + (gameResult?.error || "desconocido"));
          else setP2pStatus("✅ Conectado! RetroArch iniciado.");
          setLoadingP2p(p => ({ ...p, guest: false }));
          return;
        }

        // Publicar guest candidate en Nakama (para conexión WAN)
        const hostUserId = hostCand.userId;
        const guestUserId = nakamaService.session?.user_id || "";
        if (nakamaService.session && hostUserId) {
          const cand = result.candidate || {};
          await nakamaService.client.writeStorageObjects(nakamaService.session, [{
            collection: "emu_p2p",
            key: "guest_candidate",
            value: { candidate: cand, hostUserId, guestUserId, timestamp: Date.now() },
            permission_read: 2,
            permission_write: 1,
          }]);
          setP2pStatus("Esperando confirmación del host...");
          const confirmed = await nakamaService.waitForP2pConnectionConfirmed(guestUserId, hostUserId);
          if (!confirmed) {
            setP2pStatus("Timeout: el host no confirmó la conexión P2P.");
            setLoadingP2p(p => ({ ...p, guest: false }));
            return;
          }
        }
        setP2pStatus("Host confirmado. Iniciando RetroArch...");
        const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
          useRelay: false, isHost: false, directConnectIp: "127.0.0.1",
          connectPort: result.forwarderPort || 55435,
        });
        if (!gameResult?.success) setP2pStatus("Error al lanzar RetroArch: " + (gameResult?.error || "desconocido"));
        else setP2pStatus("✅ Conectado! RetroArch iniciado.");
      } else {
        setP2pStatus(`Error: ${result.error}`);
      }
    } catch (e) {
      console.error("P2P guest error:", e);
      setP2pStatus("Error al conectar guest P2P");
    }
    setLoadingP2p(p => ({ ...p, guest: false }));
  };

  const handleP2pDisconnect = async () => {
    await (window as any).electron.ipcRenderer.invoke("kill-retroarch");
    await (window as any).electron.ipcRenderer.invoke("p2p-disconnect");
    await nakamaService.deleteP2pCandidates();
    setP2pHostCandidate(null);
    setP2pAutoCandidate(null);
    setP2pGuestReady(false);
    p2pDiscoveryRef.current = false;
    setP2pWanHostPublic("");
    setP2pWanLanAddr("");
    setP2pWanUpnp(null);
    setP2pWanGuestInput("");
    setP2pWanStatus("");
    setP2pStatus("Desconectado");
  };

  const handleP2pHostWan = async () => {
    setLoadingP2pWan(true);
    setP2pWanStatus("Iniciando host P2P (WAN)...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("p2p-host");
      if (result.success && result.nat) {
        const publicAddr = `${result.nat.publicIp}:${result.nat.publicPort}`;
        const lanIps = result.candidate?.privateIps || [];
        const realLanIp = lanIps.find((ip: string) => !ip.startsWith('100.'));
        const lanAddr = realLanIp ? `${realLanIp}:${result.nat.publicPort}` : "";
        setP2pWanHostPublic(publicAddr);
        setP2pWanLanAddr(lanAddr);
        setP2pWanStatus(`✅ Host P2P listo. Iniciando RetroArch...`);
        const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
          useRelay: false, isHost: true,
        });
        if (!gameResult?.success) {
          setP2pWanStatus(`⚠️ RA no inició. IP visible igual.`);
        } else {
          setP2pWanStatus(`✅ Host P2P + RA activos`);
        }
      } else {
        setP2pWanStatus(`Error: ${result.error || "no se pudo obtener IP pública"}`);
      }
    } catch (e) {
      console.error("P2P host WAN error:", e);
      setP2pWanStatus("Error al iniciar host P2P");
    }
    setLoadingP2pWan(false);
  };

  const handleP2pGuestWan = async () => {
    const addr = p2pWanGuestInput.trim();
    if (!addr.includes(':')) { setP2pWanStatus("Formato inválido. Usá IP:puerto (ej: 203.0.113.5:55435)"); return; }
    setLoadingP2pWan(true);
    setP2pWanStatus("Conectando al host P2P (WAN)...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("p2p-guest-wan", { hostAddress: addr });
      if (result.success) {
        const mode = result.status?.includes('direct') ? 'directo' : 'relay';
        setP2pWanStatus(`✅ Conectado (${mode}). Iniciando RetroArch...`);
        const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
          useRelay: false, isHost: false, directConnectIp: "127.0.0.1",
          connectPort: result.forwarderPort || 55435,
        });
        if (!gameResult?.success) setP2pWanStatus("Error al lanzar RA: " + (gameResult?.error || "desconocido"));
        else setP2pWanStatus("✅ Conectado! RetroArch iniciado.");
      } else {
        setP2pWanStatus(`Error: ${result.error}`);
      }
    } catch (e) {
      console.error("P2P guest WAN error:", e);
      setP2pWanStatus("Error al conectar guest P2P");
    }
    setLoadingP2pWan(false);
  };

  const handleBootstrapHost = async () => {
    setBootstrapLoading(true);
    setBootstrapStatus("Iniciando sala pública (bore + paste)...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-host");
      if (result.success && result.roomCode) {
        setBootstrapRoomCode(result.roomCode);
        setBootstrapBoreUrl(result.boreUrl || "");
        setBootstrapStatus("SALA PÚBLICA ACTIVA — Compartí el código");
      } else if (result.success && !result.roomCode && result.boreUrl) {
        setBootstrapBoreUrl(result.boreUrl);
        setBootstrapStatus("⚠️ " + (result.error || "Usá esta URL manualmente: " + result.boreUrl));
      } else {
        setBootstrapStatus("Error: " + (result.error || "desconocido"));
      }
    } catch (e: any) {
      setBootstrapStatus("Error inesperado: " + String(e));
    }
    setBootstrapLoading(false);
  };

  const handleBootstrapGuest = async () => {
    const code = bootstrapRoomInput.trim();
    if (!code) { alert("Ingresá el código de sala de 6 caracteres."); return; }
    setBootstrapLoading(true);
    setBootstrapStatus("Conectando a sala pública...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-guest", { roomCode: code });
      if (result.success && result.boreUrl) {
        setBootstrapBoreUrl(result.boreUrl);
        if (result.warning) {
          setBootstrapStatus(`⚠️ ${result.warning}`);
        } else {
          setBootstrapStatus(`✅ Conectado. Nakama remoto configurado en ${result.boreUrl}. Presioná INSERT COIN para reconectar.`);
        }
      } else {
        setBootstrapStatus("Error: " + (result.error || "desconocido"));
      }
    } catch (e: any) {
      setBootstrapStatus("Error inesperado: " + String(e));
    }
    setBootstrapLoading(false);
  };

  const handleBootstrapClose = async () => {
    setBootstrapLoading(true);
    setBootstrapStatus("Cerrando sala pública...");
    try {
      await (window as any).electron.ipcRenderer.invoke("bootstrap-close");
      setIsBootstrapSala(false);
      setBootstrapRoomCode("");
      setBootstrapBoreUrl("");
      setBootstrapRoomInput("");
      setBootstrapStatus("Conexión P2P cerrada. Nakama restaurado a localhost.");
    } catch (e: any) {
      setBootstrapStatus("Error cerrando sala: " + String(e));
    }
    setBootstrapLoading(false);
  };

  const handleTailscaleHost = async () => {
    setLoading(p => ({ ...p, tsHost: true }));
    setTsStatus("Iniciando host RA...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("tailscale-host");
      if (result.success) {
        setTailscaleHostIp(result.ip);
        setTsStatus(result.message || `Host activo — IP: ${result.ip}`);
        await nakamaService.publishHostInfo(result.ip, "tailscale");
      } else {
        alert("Error Tailscale: " + result.error);
        setTsStatus("");
      }
    } catch (e) {
      console.error("Error Tailscale host:", e);
      alert("Error al iniciar host Tailscale");
      setTsStatus("");
    }
    setLoading(p => ({ ...p, tsHost: false }));
  };

  const handleTailscaleGuest = async () => {
    if (!tailscaleHostIp) { alert("Pegá la IP del host en el campo de texto primero"); return; }
    setLoading(p => ({ ...p, tsJoin: true }));
    setTsStatus("Conectando a host via Tailscale...");
    try {
      const result = await (window as any).electron.ipcRenderer.invoke("tailscale-guest", { hostIp: tailscaleHostIp });
      if (!result.success) {
        alert("Error Tailscale: " + (result.error || "desconocido"));
        setTsStatus("");
      } else {
        setTsStatus("Conectado a host via Tailscale");
      }
    } catch (e) {
      console.error("Error Tailscale guest:", e);
      alert("Error al conectar via Tailscale");
      setTsStatus("");
    }
    setLoading(p => ({ ...p, tsJoin: false }));
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(myTailscaleIp);
    setCopiedIp(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopiedIp(false), 2000);
  };

  const checkPeer = useCallback(async () => {
    if (!isAuthenticated || isHostingSala || nakamaHost === "127.0.0.1") return;
    const result = await (window as any).electron.ipcRenderer.invoke("check-peer-connectivity", { host: nakamaHost });
    setPeerReachable(result.reachable);
  }, [isAuthenticated, isHostingSala, nakamaHost]);

  useEffect(() => {
    if (!isAuthenticated) return;
    checkPeer();
    const interval = setInterval(checkPeer, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkPeer]);

  useEffect(() => {
    if (!isAuthenticated || !isHostingSala) return;
    const refresh = async () => {
      const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
      if (ts.ip) {
        if (ts.ip !== myTailscaleIp) setMyTailscaleIp(ts.ip);
        await nakamaService.publishHostInfo(ts.ip, "tailscale");
      }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isHostingSala, myTailscaleIp]);

  // Auto-descubrimiento: guest lee IP del host desde Nakama Storage (sin auto-join)
  useEffect(() => {
    if (!isAuthenticated || isHostingSala || !onlineUsers.length || discoveryDoneRef.current) return;
    const discover = async () => {
      for (const user of onlineUsers) {
        if (user.userId === userId) continue;
        const info = await nakamaService.fetchHostInfoForUser(user.userId);
        if (info && info.ip) {
          discoveryDoneRef.current = true;
          setTailscaleHostIp(info.ip);
          setStatusText(`IP del host detectada automáticamente: ${info.ip}`);
          break;
        }
      }
    };
    discover();
  }, [isAuthenticated, isHostingSala, onlineUsers, userId]);

  // Auto-descubrimiento P2P: guest detecta candidate del host via Nakama
  useEffect(() => {
    if (!isAuthenticated || isHostingSala || !onlineUsers.length || p2pDiscoveryRef.current) return;
    const discover = async () => {
      for (const user of onlineUsers) {
        if (user.userId === userId) continue;
        const cand = await nakamaService.fetchP2pCandidate(user.userId);
        if (cand && cand.publicIp) {
          p2pDiscoveryRef.current = true;
          cand.userId = user.userId;
          setP2pAutoCandidate(cand);
          setP2pStatus("Host P2P detectado! Presioná JOIN P2P para conectarte.");
          break;
        }
      }
    };
    discover();
  }, [isAuthenticated, isHostingSala, onlineUsers, userId]);

  // Host: polling de guest candidate via Nakama Storage
  useEffect(() => {
    if (!isAuthenticated || !isHostingSala || !p2pHostCandidate || !userId) return;
    const poll = setInterval(async () => {
      try {
        const objs = await nakamaService.listAllP2pObjects();
        const guestObj = objs.find(o => o.key === "guest_candidate" && o.hostUserId === userId);
        if (guestObj && guestObj.candidate) {
          clearInterval(poll);
          setP2pStatus("Guest conectado! Registrando...");
          const regResult = await (window as any).electron.ipcRenderer.invoke("p2p-host-register-guest", { guestCandidate: guestObj.candidate });
          if (regResult?.success && guestObj.guestUserId) {
            await nakamaService.publishP2pConnectionConfirmed(guestObj.guestUserId);
          }
          setP2pStatus("✅ Guest conectado via P2P");
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [isAuthenticated, isHostingSala, p2pHostCandidate, userId]);

  // Reset discovery flag cuando se desconecta
  useEffect(() => {
    if (!isAuthenticated) { discoveryDoneRef.current = false; p2pDiscoveryRef.current = false; }
  }, [isAuthenticated]);

  // Auto-detect IP for GGPO mode
  useEffect(() => {
    if (!isAuthenticated || engine !== "ggpo" || ggpoIp) return
    const detect = async () => {
      const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip")
      if (ts.ip) { setGgpoIp(ts.ip); return }
      const lan = await (window as any).electron.ipcRenderer.invoke("get-lan-ip")
      if (lan.ip && lan.ip !== "127.0.0.1") setGgpoIp(lan.ip)
    }
    detect()
  }, [isAuthenticated, engine, ggpoIp])

  // Periodic IP refresh for GGPO host
  useEffect(() => {
    if (!isAuthenticated || engine !== "ggpo" || ggpoStatus !== "waiting_guest") return
    const refresh = async () => {
      const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip")
      if (ts.ip && ts.ip !== ggpoIp) setGgpoIp(ts.ip)
    }
    const iv = setInterval(refresh, 30000)
    return () => clearInterval(iv)
  }, [isAuthenticated, engine, ggpoStatus, ggpoIp])

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <StatusProvider>
        {errorMsg && (
          <ErrorBanner
            message={errorMsg}
            type="error"
            onDismiss={() => setErrorMsg(null)}
          />
        )}
        <ToastHost />
        <AppShell
        showPlayers={isAuthenticated}
        showBack={isAuthenticated || joinMode === "join"}
        onBack={isAuthenticated ? () => {
          (window as any).electron.ipcRenderer.invoke("p2p-stop-broadcast");
          (window as any).electron.ipcRenderer.invoke("bootstrap-close");
          logout();
          setJoinMode(null);
          setNakamaHost("127.0.0.1");
          setNakamaPort("7350");
          setNakamaReady(false);
          setStatusText("");
          setPeerReachable(null);
          setIsP2pSala(false);
          setIsBootstrapSala(false);
          setMyTailscaleIp("");
          setTailscaleHostIp("");
          setCopiedIp(false);
          setP2pStatus("");
          setP2pAutoCandidate(null);
          setP2pHostCandidate(null);
          setP2pGuestReady(false);
          setBootstrapRoomCode("");
          setBootstrapBoreUrl("");
          setBootstrapRoomInput("");
          setBootstrapStatus("");
          setBootstrapLoading(false);
          discoveryDoneRef.current = false;
          p2pDiscoveryRef.current = false;
        } : () => {
          setJoinMode(null);
          setIsP2pSala(false);
          setP2pStatus("");
          setBootstrapRoomCode("");
          setBootstrapBoreUrl("");
          setBootstrapRoomInput("");
          setBootstrapStatus("");
          setBootstrapLoading(false);
        }}
        showNetplayConfig={showNetplayConfig}
        onToggleNetplayConfig={() => setShowNetplayConfig((o) => !o)}
      >
        <GameCard>
          <GameTitle>READY<span> GO!</span></GameTitle>
          <DebugInfo>EMULATRANS v1.0</DebugInfo>

          {!isAuthenticated ? (
            <>
              {joinMode === null ? (
                <>
                  <Section $accent={theme.colors.primary} style={{ borderStyle: "solid", borderWidth: 2, borderColor: theme.colors.primary + "aa", padding: "16px" }}>
                    <p style={{ color: theme.colors.primary, fontFamily: theme.fonts.arcade, fontSize: "0.65rem", marginBottom: 10, textAlign: "center" }}>
                      ▸ SALA TAILSCALE ◂
                    </p>
                    <Row style={{ maxWidth: 480, margin: "0 auto" }}>
                      <SalaButton onClick={async () => {
                        setJoinMode("create");
                        discoveryDoneRef.current = false;
                        await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: "127.0.0.1", port: "7350" });
                        setNakamaHost("127.0.0.1"); setNakamaPort("7350");
                        await loginGhost();
                        const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
                        if (ts.ip) {
                          setMyTailscaleIp(ts.ip);
                          await nakamaService.publishHostInfo(ts.ip, "tailscale");
                        }
                        await (window as any).electron.ipcRenderer.invoke("open-firewall-port");
                      }} $accent={theme.colors.primary}>
                        CREAR SALA
                        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                          Iniciá tu propia sala y compartí la IP
                        </span>
                      </SalaButton>
                      <SalaButton onClick={() => {
                        setJoinMode("join");
                        const saved = localStorage.getItem("emu_latam_last_guest_ip");
                        if (saved) {
                          const parts = saved.split(":");
                          setNakamaHost(parts[0]);
                          if (parts[1]) setNakamaPort(parts[1]);
                        }
                      }} $accent={theme.colors.primary}>
                        UNIRSE A SALA
                        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                          Conectate a la sala de un amigo
                        </span>
                      </SalaButton>
                    </Row>
                  </Section>

                  {/* ─── OTROS MÉTODOS DE CONEXIÓN (colapsado) ─── */}
                  <ToggleBtn $isOpen={showAltMethods} onClick={() => setShowAltMethods((p) => !p)}>
                    {showAltMethods ? "▲ OCULTAR OTROS MÉTODOS" : "▼ OTROS MÉTODOS DE CONEXIÓN"}
                  </ToggleBtn>

                  <Collapsible $open={showAltMethods}>
                  {/* ─── CONEXIÓN VÍA P2P (sin Tailscale, con bore) ─── */}
                  <Section $accent="#0f0" style={{ borderStyle: "solid", borderWidth: 2, borderColor: "#0f08", padding: "16px" }}>
                    <p style={{ color: "#0f0", fontFamily: theme.fonts.arcade, fontSize: "0.65rem", marginBottom: 10, textAlign: "center" }}>
                      ▸ SALA PÚBLICA (SIN TAILSCALE, CON BORE) ◂
                    </p>
                    {bootstrapRoomCode ? (
                      <div style={{ textAlign: "center" }}>
                        <StatusText $color="#0f0" style={{ fontSize: "1.4rem", fontWeight: "bold", textAlign: "center", margin: "8px 0" }}>
                          CÓDIGO: {bootstrapRoomCode}
                        </StatusText>
                        <StatusText $color="#888" style={{ fontSize: "0.5rem", marginBottom: 4 }}>
                          Compartí este número con tu amigo
                        </StatusText>
                        {bootstrapLanIp && (
                          <StatusText $color="#66f" style={{ fontSize: "0.5rem", marginBottom: 6, textAlign: "center" }}>
                            Test local: guest usa IP <b>{bootstrapLanIp}</b> (misma red)
                          </StatusText>
                        )}
                        <Btn onClick={() => { navigator.clipboard.writeText(bootstrapRoomCode); }} $accent="#0f0" $bg="#0f022">
                          📋 COPIAR CÓDIGO
                        </Btn>
                        <Btn onClick={async () => {
                          await handleBootstrapClose();
                          setJoinMode(null);
                        }} $accent="#f00" $bg="#500" style={{ marginTop: 8, fontSize: "0.5rem", padding: "6px" }}>
                          CERRAR CONEXIÓN
                        </Btn>
                      </div>
                    ) : bootstrapBoreUrl && !bootstrapRoomCode ? (
                      <div style={{ textAlign: "center" }}>
                        <StatusText $color="#fa0" style={{ marginBottom: 6 }}>
                          ⚠️ {bootstrapStatus}
                        </StatusText>
                        <Btn onClick={() => { navigator.clipboard.writeText(bootstrapBoreUrl); }} $accent="#0f0" $bg="#0f022">
                          📋 COPIAR URL
                        </Btn>
                        <Btn onClick={async () => {
                          await handleBootstrapClose();
                          setJoinMode(null);
                        }} $accent="#f00" $bg="#500" style={{ marginTop: 6, fontSize: "0.5rem", padding: "6px" }}>
                          CERRAR
                        </Btn>
                </div>
              ) : (
                      <Row style={{ maxWidth: 480, margin: "0 auto" }}>
                        <SalaButton disabled={bootstrapLoading} onClick={async () => {
                          setBootstrapLoading(true);
                          setBootstrapStatus("Iniciando conexión P2P...");
                          const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-host");
                          if (result.success && result.roomCode) {
                            setBootstrapRoomCode(result.roomCode);
                            setBootstrapBoreUrl(result.boreUrl || "");
                            setBootstrapLanIp(result.lanIp || "");
                            setBootstrapStatus("Conexión P2P activa — Compartí el código");
                            setIsBootstrapSala(true);
                            setIsP2pSala(false);
                            setJoinMode("create");
                            discoveryDoneRef.current = false;
                            await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: "127.0.0.1", port: "7350" });
                            setNakamaHost("127.0.0.1"); setNakamaPort("7350");
                            await loginGhost();
                            setBootstrapStatus("Sala P2P lista. Compartí el código.");
                          } else {
                            setBootstrapStatus("Error: " + (result.error || "desconocido"));
                          }
                          setBootstrapLoading(false);
                        }} $accent="#0f0">
                          CREAR CONEXIÓN P2P
                          <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                            Host: creá conexión y compartí el código
                          </span>
                        </SalaButton>
                        <SalaButton onClick={() => {
                          setJoinMode("bootstrap");
                          setBootstrapRoomInput("");
                        }} $accent="#0f0">
                          CONECTAR VÍA P2P
                          <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                            Guest: ingresá código numérico
                          </span>
                        </SalaButton>
                      </Row>
                    )}
                    {bootstrapStatus && !bootstrapRoomCode && !bootstrapBoreUrl && (
                      <StatusText $color={bootstrapStatus.startsWith("✅") ? "#0f0" : bootstrapStatus.startsWith("⚠️") ? "#fa0" : "#f88"} style={{ fontSize: "0.65rem", textAlign: "center", marginTop: 4 }}>
                        {bootstrapStatus}
                      </StatusText>
                    )}
                  </Section>

                  <Section $accent="#f0f" style={{ borderStyle: "solid", borderWidth: 2, borderColor: "#f0f88", padding: "16px" }}>
                    <p style={{ color: "#f0f", fontFamily: theme.fonts.arcade, fontSize: "0.65rem", marginBottom: 10, textAlign: "center" }}>
                      ▸ SALA P2P (SIN TERCEROS) ◂
                    </p>
                    <Row style={{ maxWidth: 480, margin: "0 auto" }}>
                      <SalaButton onClick={async () => {
                        setJoinMode("create");
                        setIsP2pSala(true);
                        setP2pStatus("Iniciando sala P2P...");
                        discoveryDoneRef.current = false;
                        const hostResult = await (window as any).electron.ipcRenderer.invoke("p2p-host");
                        if (hostResult.success && hostResult.nat) {
                          const pub = `${hostResult.nat.publicIp}:${hostResult.nat.publicPort}`;
                          const lanIps = hostResult.candidate?.privateIps || [];
                          const realLan = lanIps.find((ip: string) => !ip.startsWith('100.'));
                          setP2pWanHostPublic(pub);
                          setP2pWanLanAddr(realLan ? `${realLan}:${hostResult.nat.publicPort}` : "");
                          setP2pWanUpnp(hostResult.upnpOk === true);
                        }
                        await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: "127.0.0.1", port: "7350" });
                        setNakamaHost("127.0.0.1"); setNakamaPort("7350");
                        await loginGhost();
                        await (window as any).electron.ipcRenderer.invoke("open-firewall-port");
                        const lan = await (window as any).electron.ipcRenderer.invoke("get-lan-ip");
                        if (lan.ip) await (window as any).electron.ipcRenderer.invoke("p2p-start-broadcast", { host: lan.ip, port: "7350" });
                        setP2pStatus("Sala lista. Compartí la IP de abajo.");
                      }} $accent="#f0f">
                        CREAR SALA P2P
                        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                          Creá tu sala y retá a otros con P2P automático
                        </span>
                      </SalaButton>
                      <SalaButton onClick={async () => {
                        setIsP2pSala(true);
                        setP2pStatus("🔍 Buscando sala P2P en la red...");
                        const result = await (window as any).electron.ipcRenderer.invoke("p2p-discover-host");
                        if (result.success) {
                          await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: result.host, port: result.port });
                          const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
                          if (ok) {
                            setNakamaHost(result.host);
                            setNakamaPort(result.port);
                            setNakamaReady(true);
                            setP2pStatus("");
                            await loginGhost();
                          } else {
                            setP2pStatus("❌ Sala encontrada pero no responde");
                          }
                        } else {
                          setP2pWanHostPublic("___MANUAL___");
                          setP2pStatus("⚠ No se encontró en LAN. Ingresá la IP del host manualmente.");
                          setJoinMode("join");
                        }
                      }} $accent="#f0f">
                        UNIRSE A SALA P2P
                        <span style={{ display: "block", fontSize: "0.5rem", opacity: 0.6, marginTop: 6, fontFamily: "Inter" }}>
                          Busca automáticamente salas en tu red
                        </span>
                      </SalaButton>
                    </Row>
                  </Section>
                  </Collapsible>
                  {p2pStatus && <StatusText $color="#f0f" style={{ fontSize: "0.65rem", textAlign: "center", marginTop: 4 }}>{p2pStatus}</StatusText>}
                </>
              ) : joinMode === "create" ? (
                isP2pSala ? (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <p style={{ color: "#f0f", fontFamily: theme.fonts.arcade, fontSize: "0.65rem", marginBottom: 10 }}>
                      ▸ SALA P2P CREADA ◂
                    </p>
                    {p2pWanHostPublic && p2pWanHostPublic !== "___MANUAL___" ? (
                      <>
                        <StatusText $color="#f0f" style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                          🌐 IP Pública: {p2pWanHostPublic}
                        </StatusText>
                        {p2pWanLanAddr && (
                          <StatusText $color="#66f" style={{ fontSize: "0.6rem" }}>
                            🏠 IP LAN: {p2pWanLanAddr}
                          </StatusText>
                        )}
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                          <Btn onClick={() => { navigator.clipboard.writeText(p2pWanHostPublic); }} $accent="#f0f" $bg="#f0f022" style={{ fontSize: "0.55rem", padding: "8px 14px" }}>
                            📋 COPIAR IP
                          </Btn>
                          <Btn onClick={handleP2pDisconnect} $accent="#f00" $bg="#500" style={{ fontSize: "0.55rem", padding: "8px 14px" }}>
                            CERRAR SALA
                          </Btn>
                        </div>
                      </>
                    ) : (
                      <StatusText $color="#f0f">Iniciando sala P2P...</StatusText>
                    )}
                    {p2pWanStatus && <StatusText $color="#f0f" style={{ fontSize: "0.6rem", marginTop: 6 }}>{p2pWanStatus}</StatusText>}
                  </div>
                ) : null
              ) : joinMode === "bootstrap" ? (
                <div style={{ marginTop: 16, width: "100%", maxWidth: 400 }}>
                  <p style={{ color: "#0f0", fontFamily: "monospace", fontSize: "0.6rem", marginBottom: 8, textAlign: "center" }}>
                    Ingresá el código numérico que te dió el host (ej: 28734)
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    <input
                      type="text"
                      value={bootstrapRoomInput}
                      onChange={(e) => setBootstrapRoomInput(e.target.value)}
                      placeholder="Ej: 28734"
                      style={{
                        width: 140, padding: "8px", borderRadius: 4, border: "1px solid #0f0",
                        background: "#111", color: "#0f0", fontSize: "0.8rem",
                        outline: "none", textAlign: "center",
                        fontFamily: "monospace", letterSpacing: "3px",
                      }}
                    />
                    <Btn onClick={async () => {
                      setBootstrapLoading(true);
                      setBootstrapStatus("Conectando...");
                      const lanIp = bootstrapGuestLanIp.trim();
                      const result = await (window as any).electron.ipcRenderer.invoke("bootstrap-guest", { roomCode: bootstrapRoomInput.trim(), lanIp: lanIp || undefined });
                      if (result.success) {
                        const parsedUrl = new URL(`http://${result.boreUrl}`);
                        const nakamaHost = parsedUrl.hostname;
                        const nakamaPort = parsedUrl.port || "7350";
                        await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: nakamaHost, port: nakamaPort });
                        setNakamaHost(nakamaHost);
                        setNakamaPort(nakamaPort);
                        setBootstrapBoreUrl(result.boreUrl);
                        setIsBootstrapSala(true);
                        setJoinMode(null);
                        setBootstrapRoomInput("");
                        setBootstrapGuestLanIp("");
                        setBootstrapStatus("");
                        await loginGhost();
                      } else {
                        setBootstrapStatus("Error: " + (result.error || "desconocido"));
                      }
                      setBootstrapLoading(false);
                    }} disabled={bootstrapLoading || !bootstrapRoomInput.trim()} $accent="#0f0" $bg="#0f022" style={{ padding: "8px 14px" }}>
                      {bootstrapLoading ? "..." : "CONECTAR"}
                    </Btn>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                    <input
                      type="text"
                      value={bootstrapGuestLanIp}
                      onChange={(e) => setBootstrapGuestLanIp(e.target.value)}
                      placeholder="IP local del host (opcional, misma red)"
                      style={{
                        width: 220, padding: "6px", borderRadius: 4, border: "1px solid #66f",
                        background: "#111", color: "#66f", fontSize: "0.65rem",
                        outline: "none", textAlign: "center",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                  {bootstrapStatus && (
                    <StatusText $color="#fa0" style={{ fontSize: "0.6rem", textAlign: "center", marginTop: 8 }}>
                      {bootstrapStatus}
                    </StatusText>
                  )}
                  <Btn onClick={() => setJoinMode(null)} $accent="#555" $bg="transparent" style={{ marginTop: 8, padding: "6px", fontSize: "0.5rem" }}>
                    VOLVER
                  </Btn>
                </div>
              ) : isP2pSala && p2pWanHostPublic === "___MANUAL___" ? (
                <div style={{ marginTop: 16, width: "100%", maxWidth: 400 }}>
                  <p style={{ color: "#f0f", fontFamily: "monospace", fontSize: "0.6rem", marginBottom: 8, textAlign: "center" }}>
                    Ingresá la IP:puerto del host
                  </p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                    <Input $accent="#f0f" type="text" value={p2pWanGuestInput}
                      onChange={e => setP2pWanGuestInput(e.target.value)}
                      placeholder="203.0.113.5:54321" style={{ width: 200, fontSize: "0.65rem", padding: "6px 8px" }} />
                    <Btn onClick={async () => {
                      setLoadingP2pWan(true);
                      setP2pWanStatus("Conectando...");
                      const result = await (window as any).electron.ipcRenderer.invoke("p2p-guest-wan", { hostAddress: p2pWanGuestInput.trim() });
                      if (result.success) {
                        const mode = result.status?.includes('direct') ? 'directo' : 'relay';
                        setP2pWanStatus(`✅ Conectado (${mode}). Iniciando RetroArch...`);
                        const gameResult = await (window as any).electron.ipcRenderer.invoke("launch-game", {
                          useRelay: false, isHost: false, directConnectIp: "127.0.0.1",
                          connectPort: result.forwarderPort || 55435,
                        });
                        if (!gameResult?.success) setP2pWanStatus("Error RA: " + (gameResult?.error || "desconocido"));
                        else setP2pWanStatus("✅ Conectado! RetroArch iniciado.");
                      } else {
                        setP2pWanStatus(`Error: ${result.error}`);
                      }
                      setLoadingP2pWan(false);
                    }} disabled={loadingP2pWan || !p2pWanGuestInput.trim()} $accent="#f0f" $bg="#f0f022" style={{ fontSize: "0.55rem", padding: "8px 14px" }}>
                      {loadingP2pWan ? "..." : "CONECTAR"}
                    </Btn>
                  </div>
                  {p2pWanStatus && <StatusText $color="#f0f" style={{ fontSize: "0.6rem", marginTop: 4 }}>{p2pWanStatus}</StatusText>}
                  <Btn onClick={() => { setP2pWanHostPublic(""); setP2pWanGuestInput(""); setP2pStatus(""); setJoinMode(null); setIsP2pSala(false); }} $accent="#555" $bg="transparent" style={{ marginTop: 8, padding: "6px", fontSize: "0.5rem" }}>
                    VOLVER
                  </Btn>
                </div>
              ) : (
                <div style={{ marginTop: 16, width: "100%", maxWidth: 400 }}>
                  <p style={{ color: "#888", fontFamily: "monospace", fontSize: "0.6rem", marginBottom: 8, textAlign: "center" }}>
                    {isP2pSala ? "Ingresá la IP del host (amigo que creó la sala)" : "Ingresá la IP y puerto de la sala a la que querés conectarte"}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    <Input $accent={theme.colors.primary} type="text" value={nakamaHost} onChange={(e) => {
                      setNakamaHost(e.target.value);
                      setPeerReachable(null);
                    }}
                      placeholder="IP del servidor" style={{ width: 140, fontSize: "0.65rem", padding: "6px 8px" }} />
                    <span style={{ color: "#555", fontFamily: "monospace", fontSize: "0.7rem" }}>:</span>
                    <Input $accent={theme.colors.primary} type="text" value={nakamaPort} onChange={(e) => {
                      setNakamaPort(e.target.value);
                      setPeerReachable(null);
                    }}
                      placeholder="7350" style={{ width: 60, fontSize: "0.65rem", padding: "6px 8px" }} />
                    <Btn onClick={async () => {
                      await (window as any).electron.ipcRenderer.invoke("set-nakama-server", { host: nakamaHost, port: nakamaPort });
                      const ok = await (window as any).electron.ipcRenderer.invoke("check-nakama-health");
                      if (ok) {
                        setNakamaReady(true);
                        await loginGhost();
                        if (!isP2pSala) {
                          const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
                          if (ts.ip) setMyTailscaleIp(ts.ip);
                        }
                        localStorage.setItem("emu_latam_last_guest_ip", `${nakamaHost}:${nakamaPort}`);
                      } else {
                        alert("No se pudo conectar al servidor. Verificá la IP.");
                      }
                    }} $accent={theme.colors.primary} $bg={theme.colors.primary + "22"} style={{ width: "auto", padding: "6px 14px", fontSize: "0.55rem" }}>
                      CONECTAR
                    </Btn>
                  </div>
                  <Btn onClick={() => setJoinMode(null)} $accent="#555" $bg="transparent" style={{ marginTop: 8, padding: "6px", fontSize: "0.5rem" }}>
                    VOLVER
                  </Btn>
                </div>
              )}
              {nakamaReady && (
                <StatusText $color="#0f0" style={{ marginTop: 10, textAlign: "center" }}>
                  ● NAKAMA ONLINE ({nakamaHost}:{nakamaPort})
                </StatusText>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", marginTop: "10px", width: "100%" }}>
              <p style={{ color: theme.colors.primary, fontFamily: theme.fonts.arcade, fontSize: "0.9rem", marginBottom: "12px" }}>
                {`> ${username} CONECTADO <`}
              </p>

              {isHostingSala && (myTailscaleIp || isP2pSala || isBootstrapSala) && (
                <Section $accent={isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : "#0af"} style={{ borderStyle: "solid", borderWidth: 3, borderColor: isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : "#0af" }}>
                  <p style={{ color: isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : "#0af", fontFamily: theme.fonts.arcade, fontSize: "1rem", marginBottom: 8, textShadow: isBootstrapSala ? "0 0 20px #0f0" : isP2pSala ? "0 0 20px #f0f" : "0 0 20px #0af" }}>
                    {isBootstrapSala ? "🟢 CONEXIÓN P2P ACTIVA" : isP2pSala ? "🏠 SALA P2P CREADA" : "🏠 SALA CREADA"}
                  </p>
                  {isBootstrapSala ? (
                    <div style={{ textAlign: "center" }}>
                      <StatusText $color="#0f0" style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "8px 0" }}>
                        CÓDIGO: {bootstrapRoomCode}
                      </StatusText>
                      <StatusText $color="#888" style={{ fontSize: "0.55rem", marginBottom: 4 }}>
                        Compartí este código con tu amigo
                      </StatusText>
                      {bootstrapLanIp && (
                        <StatusText $color="#66f" style={{ fontSize: "0.5rem", marginBottom: 6, textAlign: "center" }}>
                          Test local (misma red): guest pone IP <b>{bootstrapLanIp}</b> en campo opcional
                        </StatusText>
                      )}
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                        <Btn onClick={() => { navigator.clipboard.writeText(bootstrapRoomCode); }} $accent="#0f0" $bg="#0f022" style={{ fontSize: "0.6rem" }}>
                          📋 COPIAR CÓDIGO
                        </Btn>
                        <Btn onClick={async () => {
                          await handleBootstrapClose();
                        }} $accent="#f00" $bg="#500" style={{ fontSize: "0.5rem", padding: "6px" }}>
                          CERRAR CONEXIÓN
                        </Btn>
                      </div>
                    </div>
                  ) : isP2pSala ? (
                    <div style={{ textAlign: "center" }}>
                      {p2pWanHostPublic && p2pWanHostPublic !== "___MANUAL___" ? (
                        <>
                          <StatusText $color="#f0f" style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                            🌐 IP Pública: {p2pWanHostPublic}
                          </StatusText>
                          {p2pWanLanAddr && (
                            <StatusText $color="#66f" style={{ fontSize: "0.6rem" }}>
                              🏠 IP LAN: {p2pWanLanAddr}
                            </StatusText>
                          )}
                          {p2pWanUpnp === true ? (
                            <StatusText $color="#0f0" style={{ fontSize: "0.5rem" }}>
                              ✅ Puerto abierto vía UPnP — WAN accesible
                            </StatusText>
                          ) : p2pWanUpnp === false ? (
                            <StatusText $color="#fa0" style={{ fontSize: "0.5rem" }}>
                              ⚠️ UPnP no disponible. Si no funciona, usá Tailscale o Sala Pública (verde)
                            </StatusText>
                          ) : null}
                          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                            <Btn onClick={() => { navigator.clipboard.writeText(p2pWanHostPublic); }} $accent="#f0f" $bg="#f0f022" style={{ fontSize: "0.55rem", padding: "8px 14px" }}>
                              📋 COPIAR IP
                            </Btn>
                            <Btn onClick={handleP2pDisconnect} $accent="#f00" $bg="#500" style={{ fontSize: "0.55rem", padding: "8px 14px" }}>
                              CERRAR SALA
                            </Btn>
                          </div>
                        </>
                      ) : (
                        <StatusText $color="#888" style={{ fontSize: "0.6rem" }}>
                          {onlineUsers.filter(u => u.userId !== userId).length > 0
                            ? `Jugadores: ${onlineUsers.filter(u => u.userId !== userId).map(u => u.username).join(", ")}`
                            : "Esperando jugadores..."}
                        </StatusText>
                      )}
                    </div>
                  ) : (
                    <>
                      <p style={{ color: "#fff", fontFamily: "monospace", fontSize: "1.5rem", background: "#000", padding: "12px 20px", borderRadius: 6, border: "2px solid #0af", display: "inline-block", marginBottom: 8, cursor: "pointer", userSelect: "text", letterSpacing: 2 }} onClick={handleCopyIp} title="Click para copiar">
                        {myTailscaleIp} <span style={{ fontSize: "0.9rem" }}>{copiedIp ? "✅" : "📋"}</span>
                      </p>
                      <StatusText $color="#0af" style={{ fontSize: "0.7rem" }}>
                        {copiedIp
                          ? "✅ IP copiada. Pasásela a tu amigo para que la pegue en UNIRSE A SALA → CONECTAR."
                          : "Hacé click en la IP para copiarla. Tu amigo debe poner esta IP en UNIRSE A SALA."}
                      </StatusText>
                    </>
                  )}
                  {tsStatus && <StatusText $color="#00f3ff" style={{ fontSize: "0.6rem" }}>{tsStatus}</StatusText>}
                </Section>
              )}

              {!isHostingSala && (
                <Section $accent={isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : "#0a0"} style={{ borderStyle: "dashed", borderColor: isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : undefined }}>
                  <p style={{ color: isBootstrapSala ? "#0f0" : isP2pSala ? "#f0f" : "#0f0", fontFamily: theme.fonts.arcade, fontSize: "0.7rem", marginBottom: 4 }}>
                    {isBootstrapSala ? "CONECTADO VÍA P2P" : isP2pSala ? "CONECTADO A SALA P2P" : "CONECTADO A SALA"}
                  </p>
                  <StatusText $color="#888" style={{ fontSize: "0.6rem" }}>
                    Servidor: {nakamaHost}:{nakamaPort}
                  </StatusText>
                  {!isP2pSala && peerReachable === false && (
                    <StatusText $color="#fa0" style={{ fontSize: "0.55rem", marginTop: 4 }}>
                      ⚠ El servidor Nakama del host parece no estar accesible desde aquí. Si no podés conectar, verificá la IP o probá modo BORE.
                    </StatusText>
                  )}
                  {isP2pSala && (
                    <StatusText $color="#888" style={{ fontSize: "0.6rem", margin: "8px 0" }}>
                      {onlineUsers.filter(u => u.userId !== userId).length > 0
                        ? `Jugadores: ${onlineUsers.filter(u => u.userId !== userId).map(u => u.username).join(", ")}`
                        : "Esperando jugadores..."}
                    </StatusText>
                  )}
                  {tsStatus && <StatusText $color="#00f3ff" style={{ fontSize: "0.6rem", marginTop: 4 }}>{tsStatus}</StatusText>}
                </Section>
              )}

              <Divider />

              <GgpoToggle disabled={!!customRelay && customRelay.includes("bore.pub")} disabledReason="GGPO no es compatible con el túnel Bore (TCP)" />

              {engine === "ggpo" && ggpoStatus !== "idle" ? (
                <div style={{ width: "100%", marginTop: 12 }}>
                  {ggpoStatus === "waiting_guest" && <GgpoHostView myIp={ggpoIp} />}
                  {ggpoStatus === "joining" && <StatusText $color="#f0f">Conectando a sala GGPO...</StatusText>}
                  {ggpoStatus === "connected" && <StatusText $color="#0f0">GGPO conectado — partida en curso</StatusText>}
                  {ggpoStatus === "error" && (
                    <Section $accent="#f00">
                      <StatusText $color="#f00">Error GGPO: usa CANCELAR y volvé a intentar</StatusText>
                      <Btn onClick={cancelHosting} $accent="#f00" style={{ marginTop: 8 }}>CANCELAR SALA</Btn>
                    </Section>
                  )}
                </div>
              ) : (
                <>
              <ToggleBtn $isOpen={showOtherMethods} onClick={() => setShowOtherMethods((p) => !p)}>
                {showOtherMethods ? "▲ OCULTAR OTROS MÉTODOS" : "▼ OTROS MÉTODOS DE CONEXIÓN"}
              </ToggleBtn>

              <Collapsible $open={showOtherMethods}>
                {/* ───── MODO TAILSCALE (P2P) — OFICIAL ───── */}
                <Section $accent="#00f3ff" style={{ borderWidth: 2 }}>
                  <SectionHeader $color="#00f3ff">
                    <Badge $bg="#00f3ff">P2P</Badge> MODO TAILSCALE — CONEXIÓN DIRECTA SIN TÚNEL
                  </SectionHeader>
                  {engine === "ggpo" ? (
                    <>
                      <div style={{ ...inline.flex, marginBottom: 8 }}>
                        <span style={{ color: "#888", fontSize: "0.65rem" }}>Tu IP: <strong style={{ color: "#fff" }}>{ggpoIp || "—"}</strong></span>
                        {ggpoIp.includes("100.") && <span style={{ color: "#0af", fontSize: "0.6rem" }}>🦎 TAILSCALE</span>}
                      </div>
                      <Btn onClick={async () => {
                        if (!ggpoIp) { alert("No se detectó IP"); return }
                        await startHosting("tailscale", ggpoIp)
                      }} $accent="#00f3ff" $bg="#00f3ff22">
                        HOST GGPO (TAILSCALE)
                      </Btn>
                      <div style={{ marginTop: 8, display: "none" }} />
                    </>
                  ) : (
                    <>
                      <Btn onClick={handleTailscaleHost} disabled={loading.tsHost} $loading={loading.tsHost} $accent="#00f3ff" $bg={loading.tsHost ? "#00f3ff22" : "transparent"}>
                        {loading.tsHost ? "INICIANDO..." : "HOST TAILSCALE"}
                      </Btn>
                      <Row style={{ marginTop: 10 }}>
                        <Btn onClick={handleTailscaleGuest} disabled={loading.tsJoin || !tailscaleHostIp} $loading={loading.tsJoin} $accent="#00f3ff" $bg={loading.tsJoin ? "#00f3ff22" : "transparent"}>
                          {loading.tsJoin ? "CONECTANDO..." : "JOIN VÍA TAILSCALE"}
                        </Btn>
                        <Input $accent="#00f3ff" type="text" value={tailscaleHostIp} onChange={(e) => setTailscaleHostIp(e.target.value)} placeholder="IP Tailscale del host" />
                      </Row>
                      {tsStatus && <StatusText $color="#00f3ff">{tsStatus}</StatusText>}
                    </>
                  )}
                </Section>

                {/* ───── MODO DIRECTO (LAN) ───── */}
                <Section $accent="#0a4a2a">
                  <SectionHeader $color="#0f0">
                    <Badge $bg="#0f0">LAN</Badge> MODO DIRECTO — SIN RELAY, SOLO RED LOCAL
                  </SectionHeader>
                  {engine === "ggpo" ? (
                    <>
                      <div style={{ ...inline.flex, marginBottom: 8 }}>
                        <span style={{ color: "#888", fontSize: "0.65rem" }}>Tu IP: <strong style={{ color: "#fff" }}>{ggpoIp || "—"}</strong></span>
                        {ggpoIp && !ggpoIp.includes("100.") && <span style={{ color: "#0f0", fontSize: "0.6rem" }}>🌐 LAN</span>}
                      </div>
                      <Btn onClick={async () => {
                        if (!ggpoIp) { alert("No se detectó IP"); return }
                        await startHosting("lan", ggpoIp)
                      }} $accent="#0f0" $bg="#0a2a1a">
                        HOST GGPO (LAN)
                      </Btn>
                      <div style={{ marginTop: 8, display: "none" }} />
                    </>
                  ) : (
                    <>
                      <Btn onClick={handleDirectHost} $accent="#0f0" $bg="#0a2a1a">
                        INICIAR HOST DIRECTO
                      </Btn>
                      <Input $accent="#0f0" type="text" value={directHostIp} onChange={(e) => setDirectHostIp(e.target.value)} placeholder="IP del host (ej: 192.168.1.100)" style={{ marginTop: 10 }} />
                      <Btn onClick={handleDirectJoin} disabled={loading.directJoin || !directHostIp} $loading={loading.directJoin} $accent="#0f0" $bg={loading.directJoin ? "#0f022" : "transparent"} style={{ marginTop: 10 }}>
                        {loading.directJoin ? "CONECTANDO..." : "JOIN DIRECTO"}
                      </Btn>
                      <StatusText $color="#888">Host → INICIAR HOST | Guest → pegar IP del host y JOIN</StatusText>
                    </>
                  )}
                </Section>

                {/* ───── MODO BORE (TÚNEL) ───── */}
                <Section $accent="#0af">
                  <SectionHeader $color="#0af">
                    <Badge $bg="#0af">BORE</Badge> MODO TÚNEL — JUEGA CON AMIGOS POR INTERNET
                  </SectionHeader>
                  {engine === "ggpo" ? (
                    <StatusText $color="#fa0">⛔ GGPO no es compatible con el túnel Bore (usa UDP, Bore es TCP). Cambiá a RETROARCH para usar este modo.</StatusText>
                  ) : (
                    <>
                      <Btn onClick={() => handleTestGame(true)} disabled={loading.bore} $loading={loading.bore} $accent="#0af" $bg={loading.bore ? "#0af22" : "transparent"}>
                        {loading.bore ? "CREANDO TÚNEL..." : "1. HOST GAME"}
                      </Btn>
                      <div style={{ ...inline.flex, marginTop: 10 }}>
                        <Input $accent="#0af" type="text" value={customRelay} onChange={(e) => setCustomRelay(e.target.value)} placeholder="URL del túnel (se copia automática)" />
                        <Btn onClick={handleSaveRelay} $accent="#555" $bg="#222" style={{ width: "auto", whiteSpace: "nowrap", fontSize: "0.6rem", padding: "10px 14px" }}>
                          GUARDAR
                        </Btn>
                      </div>
                      <Btn onClick={() => handleTestGame(false)} disabled={!customRelay} $accent="#0af" style={{ marginTop: 10 }}>
                        2. JOIN GAME
                      </Btn>
                      <StatusText $color="#888">Host → 1. HOST GAME | Guest → 2. JOIN GAME</StatusText>
                    </>
                  )}
                </Section>

                {/* ───── MODO P2P PROPIO (Módulo 18) ───── */}
                <Section $accent="#f0f">
                  <SectionHeader $color="#f0f">
                    <Badge $bg="#f0f">P2P</Badge> MODO P2P PROPIO — HOLE PUNCHING + RELAY SIN TÚNEL
                  </SectionHeader>
                  {engine === "ggpo" ? (
                    <StatusText $color="#fa0">⛔ P2P propio usa UDP, no compatible con GGPO (TCP). Cambiá a RETROARCH.</StatusText>
                  ) : (
                    <>
                      <Btn onClick={handleP2pHost} disabled={loadingP2p.host || loadingP2p.guest} $loading={loadingP2p.host} $accent="#f0f" $bg={loadingP2p.host ? "#f0f22" : "transparent"}>
                        {loadingP2p.host ? "INICIANDO..." : "HOST P2P"}
                      </Btn>
                      <Btn onClick={handleP2pGuest} disabled={loadingP2p.guest} $loading={loadingP2p.guest} $accent="#f0f" $bg={loadingP2p.guest ? "#f0f22" : "transparent"} style={{ marginTop: 10 }}>
                        {loadingP2p.guest ? "CONECTANDO..." : "JOIN P2P"}
                      </Btn>
                      {p2pStatus && <StatusText $color="#f0f" style={{ marginTop: 6 }}>{p2pStatus}</StatusText>}
                      <Btn onClick={handleP2pDisconnect} $accent="#555" $bg="#222" style={{ marginTop: 8, fontSize: "0.55rem", padding: "6px" }}>
                        DESCONECTAR P2P
                      </Btn>
                    </>
                  )}
                </Section>

                {/* ───── MODO DEBUG ───── */}
                <Section $accent="#a0a">
                  <SectionHeader $color="#a0a">
                    <Badge $bg="#a0a">DBG</Badge> DEBUG — PRUEBAS LOCALES
                  </SectionHeader>
                  {engine === "ggpo" ? (
                    <>
                      <Btn onClick={async () => {
                        try {
                          console.log("GGPO TEST LOCAL: iniciando...")
                          const electron = (window as any).electron
                          const r = await electron.ipcRenderer.invoke("ggpo-launch-local")
                          console.log("GGPO TEST LOCAL: respuesta", r)
                          if (!r.success) { alert("Error: " + r.error); return }
                        } catch (e) {
                          console.error("GGPO TEST LOCAL: excepción", e)
                          alert("Error inesperado: " + e)
                        }
                      }} $accent="#a0a" $bg="#a0a22">
                        TEST LOCAL GGPO
                      </Btn>
                      <StatusText $color="#888">Abre dos instancias de fcadefbneo en la misma PC</StatusText>
                    </>
                  ) : (
                    <Btn onClick={handleTestMitmLocal} disabled={loading.mitm} $loading={loading.mitm} $accent="#a0a" $bg={loading.mitm ? "#a0a22" : "transparent"}>
                      {loading.mitm ? "INICIANDO..." : "MITM LOCAL (HOST+GUEST MISMA PC)"}
                    </Btn>
                  )}
                </Section>
              </Collapsible>

              {engine === "ggpo" && ggpoStatus === "idle" && (
                <div style={{ marginTop: 12 }}>
                  <GgpoGuestView onJoin={(userId, room) => joinRoom(userId, room)} />
                </div>
              )}
                </>)}

              {statusText && <StatusText $color={theme.colors.accent} style={{ textAlign: "center" }}>{statusText}</StatusText>}

              <Divider />
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <StatusText $color={isConnected ? theme.colors.success : theme.colors.danger} style={{ margin: 0, fontSize: "0.55rem" }}>
                  {isConnected ? "● WEBSOCKET CONNECTED" : "○ WEBSOCKET DISCONNECTED"}
                </StatusText>
              </div>
            </div>
          )}
        </GameCard>
      </AppShell>
      <ChallengeModal />
      {showNetplayConfig && <NetplayConfigModal isOpen={showNetplayConfig} onClose={() => setShowNetplayConfig(false)} />}
      {showNamePicker && <NamePickerModal onConfirm={(name) => { updateDisplayName(name); setShowNamePicker(false); }} />}
      </StatusProvider>
    </ThemeProvider>
  );
}

export default App;
