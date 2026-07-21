import { contextBridge, ipcRenderer } from "electron";
import { IPC_WHITELIST } from "../main/services/ipcChannels";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel: string, data?: any) => {
      if (!IPC_WHITELIST.has(channel)) {
        return Promise.reject(new Error(`IPC channel '${channel}' is not in the whitelist`));
      }
      return ipcRenderer.invoke(channel, data);
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
  },
  getStatus: () => ipcRenderer.invoke("get-status"),
  getMetrics: () => ipcRenderer.invoke("get-metrics"),
  validateDependencies: () => ipcRenderer.invoke("validate-dependencies"),
  onError: (callback: (data: any) => void) => {
    ipcRenderer.on("report-error", (_event, data) => callback(data));
  },
  ggpoLaunch: (args: any) => ipcRenderer.invoke("ggpo-launch", args),
  ggpoKill: () => ipcRenderer.invoke("ggpo-kill"),
  getLanIp: () => ipcRenderer.invoke("get-lan-ip"),
});
