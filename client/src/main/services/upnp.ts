import { createClient } from 'nat-upnp';

let client: Client | null = null;
let mappedPorts: Map<number, { description: string; ttl: number }> = new Map();

function getClient(): Client {
  if (!client) client = createClient();
  return client;
}

export async function tryMapPort(port: number, protocol: 'UDP' | 'TCP', description: string, ttl: number = 0, localIp?: string): Promise<boolean> {
  try {
    const c = getClient();
    const opts: any = {
      public: port,
      private: port,
      protocol,
      description,
      ttl,
    };
    if (localIp) opts.local = localIp;
    await new Promise<void>((resolve, reject) => {
      c.portMapping(opts, (err) => err ? reject(err) : resolve());
    });
    mappedPorts.set(port, { description, ttl });
    console.log(`[UPnP] Puerto ${port}/${protocol} abierto: ${description}${localIp ? ` (local: ${localIp})` : ''}`);
    return true;
  } catch (err: any) {
    console.log(`[UPnP] No se pudo abrir puerto ${port}/${protocol}: ${err.message}`);
    return false;
  }
}

export async function tryUnmapPort(port: number, protocol: 'UDP' | 'TCP'): Promise<void> {
  try {
    const c = getClient();
    await new Promise<void>((resolve, reject) => {
      c.portUnmapping({
        public: port,
        protocol,
      }, (err) => err ? reject(err) : resolve());
    });
    mappedPorts.delete(port);
    console.log(`[UPnP] Puerto ${port}/${protocol} cerrado`);
  } catch (err: any) {
    console.log(`[UPnP] Error al cerrar puerto ${port}/${protocol}: ${err.message}`);
  }
}

export async function getExternalIp(): Promise<string | null> {
  try {
    const c = getClient();
    const ip = await new Promise<string>((resolve, reject) => {
      c.externalIp((err, ip) => err ? reject(err) : resolve(ip || ''));
    });
    return ip || null;
  } catch {
    return null;
  }
}

export function cleanupAllMappings(): void {
  for (const [port, info] of mappedPorts) {
    tryUnmapPort(port, 'UDP');
    tryUnmapPort(port, 'TCP');
  }
  mappedPorts.clear();
}
