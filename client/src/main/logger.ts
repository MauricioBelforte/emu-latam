export function logInfo(module: string, msg: string): void {
  console.log(`[INFO] [${module}] ${msg}`)
}

export function logWarn(module: string, msg: string): void {
  console.log(`[WARN] [${module}] ${msg}`)
}

export function logError(module: string, msg: string): void {
  console.error(`[ERROR] [${module}] ${msg}`)
}

export function logDebug(module: string, msg: string): void {
  console.log(`[DEBUG] [${module}] ${msg}`)
}
