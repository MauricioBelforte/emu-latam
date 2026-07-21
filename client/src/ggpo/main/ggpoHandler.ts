import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import type { ChildProcess } from "child_process"
import { logInfo, logError } from "../../main/logger"

let ggpoProcess: ChildProcess | null = null
let ggpoProcess2: ChildProcess | null = null

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
  if (ggpoProcess2) {
    logInfo("GGPO", "Matando fcadefbneo #2...")
    ggpoProcess2.kill()
    ggpoProcess2 = null
  }
}

export function spawnLocalTest(binaryPath: string, rom = "kof98"): void {
  const args1: GgpoLaunchArgs = { rom, localPort: 6003, remoteIp: "127.0.0.1", remotePort: 6004, playerNumber: 0 }
  const args2: GgpoLaunchArgs = { rom, localPort: 6004, remoteIp: "127.0.0.1", remotePort: 6003, playerNumber: 1 }

  logInfo("GGPO", "=== INICIANDO TEST LOCAL GGPO ===")

  const q1 = buildQuarkArgs(args1)
  ggpoProcess = spawn(binaryPath, q1, { windowsHide: false, stdio: "ignore" })
  ggpoProcess.on("error", (err) => { logError("GGPO", `P1 error: ${err.message}`); ggpoProcess = null })
  ggpoProcess.on("close", (code) => { logInfo("GGPO", `P1 cerrado (código: ${code})`); ggpoProcess = null })
  if (ggpoProcess.pid) logInfo("GGPO", `P1 PID: ${ggpoProcess.pid}`)

  const q2 = buildQuarkArgs(args2)
  ggpoProcess2 = spawn(binaryPath, q2, { windowsHide: false, stdio: "ignore" })
  ggpoProcess2.on("error", (err) => { logError("GGPO", `P2 error: ${err.message}`); ggpoProcess2 = null })
  ggpoProcess2.on("close", (code) => { logInfo("GGPO", `P2 cerrado (código: ${code})`); ggpoProcess2 = null })
  if (ggpoProcess2.pid) logInfo("GGPO", `P2 PID: ${ggpoProcess2.pid}`)

  logInfo("GGPO", "=== TEST LOCAL GGPO INICIADO ===")
}

export function getGgpoProcess(): ChildProcess | null {
  return ggpoProcess
}

export function getDefaultPorts() {
  return { hostPort: GGPO_HOST_PORT, guestPort: GGPO_GUEST_PORT }
}
