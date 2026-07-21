import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import type { ChildProcess } from "child_process"
import { logInfo, logError } from "../../main/logger"

let ggpoProcess: ChildProcess | null = null

const GGPO_HOST_PORT = 6003
const GGPO_GUEST_PORT = 6004

export interface GgpoLaunchArgs {
  rom: string
  localPort: number
  remoteIp: string
  remotePort: number
  playerNumber: 0 | 1
}

export function buildQuarkArgs(args: GgpoLaunchArgs): string[] {
  const { rom, localPort, remoteIp, remotePort, playerNumber } = args
  return [`quark:direct,${rom},${localPort},${remoteIp},${remotePort},${playerNumber},0`, "-w"]
}

export function findFcadefbneo(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, "fcadefbneo", "fcadefbneo.exe"),
    path.join(projectRoot, "resources", "fcadefbneo.exe"),
    path.join(projectRoot, "extraResources", "fcadefbneo.exe"),
    path.join(projectRoot, "retroarch", "fcadefbneo.exe"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

export function spawnFcadefbneo(binaryPath: string, args: GgpoLaunchArgs): ChildProcess {
  const quarkArgs = buildQuarkArgs(args)
  logInfo("GGPO", `Lanzando: ${binaryPath} ${quarkArgs.join(" ")}`)

  const proc = spawn(binaryPath, quarkArgs, {
    windowsHide: false,
    stdio: "ignore",
  })

  ggpoProcess = proc

  proc.on("error", (err) => {
    logError("GGPO", `Error al iniciar fcadefbneo: ${err.message}`)
    ggpoProcess = null
  })

  proc.on("close", (code) => {
    logInfo("GGPO", `fcadefbneo cerrado (código: ${code})`)
    ggpoProcess = null
  })

  if (proc.pid) {
    logInfo("GGPO", `fcadefbneo PID: ${proc.pid}`)
  }

  return proc
}

export function killGgpo(): void {
  if (ggpoProcess) {
    logInfo("GGPO", "Matando fcadefbneo...")
    ggpoProcess.kill()
    ggpoProcess = null
  }
}

export function getGgpoProcess(): ChildProcess | null {
  return ggpoProcess
}

export function getDefaultPorts() {
  return { hostPort: GGPO_HOST_PORT, guestPort: GGPO_GUEST_PORT }
}
