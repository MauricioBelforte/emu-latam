# 04 - Especificación de Código — Relay WAN para GGPO vía P2P

> **Módulo:** 19-GGPO-P2P-WAN
> **Fecha:** 2026-07-24
> **Versión:** 1.0

---

## 1. ggpoP2PBridge.ts (NUEVO)

```typescript
// client/src/main/ggpoP2PBridge.ts
// Bridge P2P específico para GGPO (paralelo e independiente de p2pBridge.ts)

import dgram from "dgram";
import { P2PManager } from "../../../p2p-module/src/index";
import { PacketType } from "../../../p2p-module/src/protocol/types";
import { encodePacket, decodePacket } from "../../../p2p-module/src/protocol/packet";

// Puertos fijos de GGPO (fcadefbneo)
const GGPO_HOST_PORT = 6003;  // Player 0 escucha aquí
const GGPO_GUEST_PORT = 6004; // Player 1 escucha aquí

// --- Estado global (separado de p2pBridge.ts) ---
let ggpoHostManager: { manager: P2PManager; token: number } | null = null;
let ggpoGuestManager: { manager: P2PManager; token: number } | null = null;
let ggpoHostRelaySocket: dgram.Socket | null = null;   // relay local en host
let ggpoGuestForwarderSocket: dgram.Socket | null = null; // forwarder local en guest
let ggpoTokenCounter = 200; // empieza en 200 para evitar colisión con p2pBridge (usa 100+)

/**
 * 1. handleGGPOP2PHost
 * Inicia P2PManager como host para GGPO.
 * Retorna candidate para que el host lo incluya en el challenge.
 */
export async function handleGGPOP2PHost(): Promise<any> {
  const token = ggpoTokenCounter++;
  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[GGPO-P2P-HOST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[GGPO-P2P-HOST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[GGPO-P2P-HOST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[GGPO-P2P-HOST] Error ${code}: ${msg}`),
    },
  });

  await manager.startHost();
  const candidate = await manager.sendCandidate();

  ggpoHostManager = { manager, token };

  return {
    success: true,
    token,
    status: manager.status,
    candidate,
  };
}

/**
 * 2. handleGGPOP2PHostRegisterGuest
 * Host registra al guest en el P2PManager.
 * Crea un socket relay local que:
 *   - Recibe datos de GGPO host (enviados a relayPort) y los reenvía como RELAY_DATA al guest
 *   - Recibe RELAY_DATA del guest y los reenvía a 127.0.0.1:6003 (GGPO host)
 * Retorna relayPort para que el host pase ese puerto a GGPO como remotePort.
 */
export async function handleGGPOP2PHostRegisterGuest(guestCandidate: any): Promise<any> {
  if (!ggpoHostManager) {
    return { success: false, error: "No active GGPO P2P host manager" };
  }
  if (!guestCandidate) {
    return { success: false, error: "No guest candidate provided" };
  }

  const { manager, token } = ggpoHostManager;
  const relayToken = ggpoTokenCounter++;

  // Registrar guest en P2P (esto activa el relay interno del P2P module,
  // pero nosotras usamos nuestro propio relay en lugar del RelayServer interno)
  // Nota: Solo necesitamos que P2PManager establezca la conexión y nos dé el transporte.
  // El relay interno de P2PManager apunta a RETROARCH_PORT (55435), no a 6003.
  // Por eso creamos nuestro propio relay aquí.
  await manager.onGuestJoin(guestCandidate, relayToken);

  // Crear socket relay local
  const relaySocket = dgram.createSocket("udp4");
  const relayPort = await new Promise<number>((resolve, reject) => {
    relaySocket.on("message", (data: Buffer) => {
      // Datos provenientes de GGPO host (player 0) enviados a relaySocket
      // → Reenviar al guest como RELAY_DATA via P2P transport
      const pkt = encodePacket(PacketType.RELAY_DATA, relayToken, data);
      const remote = manager.getRemoteInfo();
      if (remote) {
        const transport = manager.getTransport();
        if (transport) transport.send(pkt, remote.port, remote.address);
      }
    });
    relaySocket.on("error", (err: any) => {
      console.error("[GGPO-P2P-HOST] relaySocket error:", err.message);
      relaySocket.close();
      reject(err);
    });
    relaySocket.bind(0, "127.0.0.1", () => resolve(relaySocket.address().port));
  });

  // Registrar handler para RELAY_DATA entrantes desde el guest
  // → Reenviar payload a 127.0.0.1:6003 (GGPO host escucha ahí)
  const transport = manager.getTransport();
  if (transport) {
    transport.onRawMessage((data: Buffer) => {
      const pkt = decodePacket(data);
      if (pkt && pkt.type === PacketType.RELAY_DATA) {
        relaySocket.send(pkt.payload, GGPO_HOST_PORT, "127.0.0.1");
      }
    });
  }

  ggpoHostRelaySocket = relaySocket;

  return {
    success: true,
    relayPort,
    peerId: guestCandidate.peerId || "unknown",
  };
}

/**
 * 3. handleGGPOP2PGuest
 * Guest se conecta al host via P2PManager.
 * Detecta automáticamente LAN vs WAN via manager.status:
 *   - "lan_check" → LAN: retorna hostLanIp (conexión directa, sin relay)
 *   - otro estado → WAN: crea forwarder local y relay via P2P
 */
export async function handleGGPOP2PGuest(hostCandidate: any): Promise<any> {
  if (!hostCandidate) {
    return { success: false, error: "No host candidate provided" };
  }

  const token = ggpoTokenCounter++;
  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[GGPO-P2P-GUEST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[GGPO-P2P-GUEST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[GGPO-P2P-GUEST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[GGPO-P2P-GUEST] Error ${code}: ${msg}`),
    },
  });

  await manager.startJoin(hostCandidate);
  const guestCandidate = await manager.sendCandidate();

  // LAN mode: detección automática por P2PManager
  if (manager.status === "lan_check") {
    const remote = manager.getRemoteInfo();
    const hostLanIp = remote?.address
      || hostCandidate.privateIps?.[0]
      || hostCandidate.publicIp;
    console.log(`[GGPO-P2P-GUEST] LAN mode directo — hostLanIp=${hostLanIp}`);

    // Guardar manager por si se necesita cleanup
    ggpoGuestManager = { manager, token };

    return {
      success: true,
      isLan: true,
      hostLanIp,
      candidate: guestCandidate,
    };
  }

  // WAN mode: crear forwarder local
  console.log("[GGPO-P2P-GUEST] WAN mode — creando forwarder...");
  const forwarderSocket = dgram.createSocket("udp4");
  const forwarderPort = await new Promise<number>((resolve, reject) => {
    forwarderSocket.on("message", (data: Buffer) => {
      // Datos provenientes de GGPO guest (player 1) enviados a forwarderSocket
      // → Reenviar al host como RELAY_DATA via P2P transport
      const pkt = encodePacket(PacketType.RELAY_DATA, token, data);
      const remote = manager.getRemoteInfo();
      if (remote) {
        const transport = manager.getTransport();
        if (transport) transport.send(pkt, remote.port, remote.address);
      }
    });
    forwarderSocket.on("error", (err: any) => {
      console.error("[GGPO-P2P-GUEST] forwarderSocket error:", err.message);
      forwarderSocket.close();
      reject(err);
    });
    forwarderSocket.bind(0, "127.0.0.1", () => resolve(forwarderSocket.address().port));
  });

  // Registrar handler para RELAY_DATA entrantes desde el host
  // → Reenviar payload a 127.0.0.1:6004 (GGPO guest escucha ahí)
  const transport = manager.getTransport();
  if (transport) {
    transport.onRawMessage((data: Buffer) => {
      const pkt = decodePacket(data);
      if (pkt && pkt.type === PacketType.RELAY_DATA) {
        forwarderSocket.send(pkt.payload, GGPO_GUEST_PORT, "127.0.0.1");
      }
    });
  }

  ggpoGuestManager = { manager, token };
  ggpoGuestForwarderSocket = forwarderSocket;

  return {
    success: true,
    isLan: false,
    forwarderPort,
    candidate: guestCandidate,
  };
}

/**
 * 4. handleGGPOP2PDisconnect
 * Limpia todos los recursos: sockets, P2PManagers.
 * No afecta a p2pBridge.ts.
 */
export function handleGGPOP2PDisconnect(): any {
  // Cerrar forwarder guest
  if (ggpoGuestForwarderSocket) {
    try { ggpoGuestForwarderSocket.close(); } catch {}
    ggpoGuestForwarderSocket = null;
  }

  // Cerrar relay host
  if (ggpoHostRelaySocket) {
    try { ggpoHostRelaySocket.close(); } catch {}
    ggpoHostRelaySocket = null;
  }

  // Desconectar P2PManager guest
  if (ggpoGuestManager) {
    try { ggpoGuestManager.manager.disconnect(); } catch {}
    ggpoGuestManager = null;
  }

  // Desconectar P2PManager host
  if (ggpoHostManager) {
    try { ggpoHostManager.manager.disconnect(); } catch {}
    ggpoHostManager = null;
  }

  return { success: true };
}
```

---

## 2. index.ts — Registro de IPC Handlers

Agregar en `client/src/main/index.ts`:

```typescript
import {
  handleGGPOP2PHost,
  handleGGPOP2PHostRegisterGuest,
  handleGGPOP2PGuest,
  handleGGPOP2PDisconnect,
} from "./ggpoP2PBridge";

// En la función createWindow() o setupIPC():
ipcMain.handle("ggpo-p2p-host", async () => {
  try {
    return await handleGGPOP2PHost();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("ggpo-p2p-guest", async (_event, args) => {
  try {
    return await handleGGPOP2PGuest(args.hostCandidate);
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("ggpo-p2p-register-guest", async (_event, args) => {
  try {
    return await handleGGPOP2PHostRegisterGuest(args.guestCandidate);
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("ggpo-p2p-disconnect", async () => {
  try {
    return handleGGPOP2PDisconnect();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});
```

---

## 3. ipcChannels.ts — Whitelist

Agregar en `client/src/main/services/ipcChannels.ts`:

```typescript
export const IPC_CHANNELS = [
  // ... canales existentes ...
  "ggpo-p2p-host",
  "ggpo-p2p-guest",
  "ggpo-p2p-register-guest",
  "ggpo-p2p-disconnect",
];
```

---

## 4. ChallengeContext.tsx — Modificaciones

### 4.1 acceptChallenge (guest side)

Reemplazar la rama actual de GGPO dentro del bloque P2P:

```typescript
// Dentro de acceptChallenge(), después de p2p-guest:
if (method === "p2p" && currentChallenge.hostCandidate) {
  try {
    // USAR ggpo-p2p-guest en vez de p2p-guest cuando engine === "ggpo"
    const ipcName = engine === "ggpo" ? "ggpo-p2p-guest" : "p2p-guest";
    const guestResult = await (window as any).electron.ipcRenderer.invoke(
      ipcName, { hostCandidate: currentChallenge.hostCandidate }
    );
    if (!guestResult.success) {
      alert("Error conectando P2P: " + (guestResult.error || "desconocido"));
      return;
    }

    // --- GGPO + WAN mode (isLan=false) ---
    if (engine === "ggpo" && !guestResult.isLan) {
      // WAN detectado: enviar ACCEPT, esperar connection_info con relayPort
      await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE, {
        targetId: challengerId,
        acceptedBy: userId,
        acceptedByName: username,
        guestCandidate: guestResult.candidate,
      });
      setTimeout(() => resetChallenge(), 5000);
      return;
    }

    // --- GGPO + LAN mode (isLan=true) ---
    if (engine === "ggpo" && guestResult.isLan) {
      // Enviar ACCEPT con guestIp (flujo existente, mismo que antes)
      const ipResult = await (window as any).electron.ipcRenderer.invoke("get-lan-ip");
      const guestOwnIp = ipResult.ip || "";
      await sendToLobby(CHALLENGE_ACCEPT_MSG_TYPE, {
        targetId: challengerId, acceptedBy: userId,
        acceptedByName: username, guestIp: guestOwnIp,
      });
      setTimeout(() => resetChallenge(), 5000);
      return;
    }

    // --- RetroArch mode (engine !== "ggpo") ---
    // ... (código existente sin cambios)
  }
}
```

### 4.2 ACCEPT handler (host side)

Reemplazar la rama GGPO dentro del bloque P2P:

```typescript
// Dentro del handler CHALLENGE_ACCEPT_MSG_TYPE:
if (method === "p2p") {
  // --- GGPO mode ---
  if (engine === "ggpo") {
    // ¿El guest aceptó en LAN o WAN?
    // Si content.guestIp está presente → LAN mode
    // Si solo content.guestCandidate → WAN mode
    if (content.guestIp) {
      // LAN mode: flujo existente
      const ipResult = await (window as any).electron.ipcRenderer.invoke("get-lan-ip");
      const myIp = ipResult.ip;
      if (!myIp) { alert("No se pudo detectar IP"); resetChallenge(); return; }
      await sendConnectionInfo(content.acceptedBy, {
        ggpoHostIp: myIp, hostName: username, useGgpo: true,
      });
    } else {
      // WAN mode: registrar guest + obtener relayPort
      try {
        const regResult = await (window as any).electron.ipcRenderer.invoke(
          "ggpo-p2p-register-guest",
          { guestCandidate: content.guestCandidate }
        );
        if (!regResult.success) {
          alert("Error registrando guest: " + regResult.error);
          resetChallenge(); return;
        }
        await sendConnectionInfo(content.acceptedBy, {
          useGgpoRelay: true,
          relayPort: regResult.relayPort,
          hostName: username,
        });
      } catch (e) {
        console.error("Error en GGPO WAN host:", e);
        resetChallenge();
      }
    }
    setTimeout(() => resetChallenge(), 5000);
    return;
  }

  // --- RetroArch mode (engine !== "ggpo") ---
  // ... (código existente sin cambios)
}
```

### 4.3 connection_info handler (guest side)

Ya existente y funcional. Solo agregar manejo de `useGgpoRelay`:

```typescript
// Dentro del handler CHALLENGE_ACCEPT_MSG_TYPE + "_conn":
if (content.useGgpo) {
  // LAN mode: flujo existente
  const hostIp = content.ggpoHostIp;
  // ... ggpo-launch con remoteIp=hostIp ...
} else if (content.useGgpoRelay) {
  // WAN mode: GGPO guest conecta a forwarder local
  const relayPort = content.relayPort;
  // Nota: relayPort es para el HOST, no para el guest.
  // El guest ya tiene su forwarderPort del resultado de ggpo-p2p-guest.
  // El guest lanza GGPO conectando a 127.0.0.1:forwarderPort (almacenado localmente).
}

if (content.useGgpo || content.useGgpoRelay) {
  // ... launch GGPO ...
}
```

Nota importante: El guest debe almacenar el `forwarderPort` retornado por `ggpo-p2p-guest` para usarlo al recibir `connection_info`. Esto puede hacerse con una variable en el closure o en un ref.

**Implementación recomendada:**

```typescript
// En ChallengeContext, agregar un ref para el forwarderPort:
const ggpoForwarderPortRef = useRef<number>(0);

// En acceptChallenge, al obtener guestResult:
if (engine === "ggpo" && !guestResult.isLan) {
  ggpoForwarderPortRef.current = guestResult.forwarderPort || 0;
  // ...
}

// En connection_info handler:
if (content.useGgpoRelay) {
  const fwdPort = ggpoForwarderPortRef.current;
  if (!fwdPort) {
    alert("Error: forwarderPort no disponible"); resetChallenge(); return;
  }
  await electron.ipcRenderer.invoke("ggpo-launch", {
    rom: "kof98",
    localPort: GGPO_GUEST_PORT,
    remoteIp: "127.0.0.1",
    remotePort: fwdPort,
    playerNumber: 1,
  });
}
```
