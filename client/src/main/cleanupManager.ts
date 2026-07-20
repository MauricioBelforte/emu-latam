type CleanupFn = () => void | Promise<void>

const cleanups: Map<string, CleanupFn> = new Map()

export function registerCleanup(name: string, fn: CleanupFn): void {
  cleanups.set(name, fn)
  console.log(`[CLEANUP] Registrado: ${name}`)
}

export function unregisterCleanup(name: string): void {
  cleanups.delete(name)
  console.log(`[CLEANUP] Desregistrado: ${name}`)
}

export async function cleanupAll(): Promise<void> {
  const entries = Array.from(cleanups.entries()).reverse()
  for (const [name, fn] of entries) {
    try {
      await fn()
      console.log(`[CLEANUP] Ejecutado: ${name}`)
    } catch (e) {
      console.error(`[CLEANUP] Error en ${name}:`, e)
    }
  }
  cleanups.clear()
  console.log("[CLEANUP] Todos los cleanups ejecutados")
}

export function getRegisteredCleanups(): string[] {
  return Array.from(cleanups.keys())
}
