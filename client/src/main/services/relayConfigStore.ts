import { app } from "electron"
import fs from "fs"
import path from "path"

interface RelayConfig {
  url: string
  setAt: number
  setBy: "host" | "manual"
}

function getProjectRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "extraResources")
  }
  return path.resolve(__dirname, "../../../..")
}

function userDataPath(): string {
  return path.join(app.getPath("userData"), "emu_latam_relay.json")
}

function legacyPath(): string {
  return path.join(getProjectRoot(), "relay-server", "active_relay.txt")
}

export const relayConfigStore = {
  read(): RelayConfig | null {
    try {
      const userData = userDataPath()
      if (fs.existsSync(userData)) {
        return JSON.parse(fs.readFileSync(userData, "utf8"))
      }
    } catch {}

    try {
      const legacy = legacyPath()
      if (fs.existsSync(legacy)) {
        const url = fs.readFileSync(legacy, "utf8").trim()
        if (url) {
          const config: RelayConfig = { url, setAt: Date.now(), setBy: "manual" }
          return config
        }
      }
    } catch {}

    return null
  },

  write(url: string, setBy: "host" | "manual"): void {
    const config: RelayConfig = { url, setAt: Date.now(), setBy }
    try {
      fs.writeFileSync(userDataPath(), JSON.stringify(config, null, 2), "utf8")
      fs.writeFileSync(legacyPath(), url, "utf8")
      console.log(`[RELAY CFG] Guardado: ${url} (${setBy})`)
    } catch (e) {
      console.error("[RELAY CFG] Error al guardar:", e)
    }
  },

  clear(): void {
    try {
      if (fs.existsSync(userDataPath())) fs.unlinkSync(userDataPath())
      if (fs.existsSync(legacyPath())) fs.unlinkSync(legacyPath())
      console.log("[RELAY CFG] Configuración eliminada")
    } catch (e) {
      console.error("[RELAY CFG] Error al limpiar:", e)
    }
  },
}
