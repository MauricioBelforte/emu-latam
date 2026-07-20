export interface MonitoredProcess {
  name: string
  proc: { pid?: number } | null
}

export interface SystemMetrics {
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
  }
  uptime: number
  processes: { name: string; pid: number | null }[]
}

export function getMetrics(processList: MonitoredProcess[]): SystemMetrics {
  const mem = process.memoryUsage()
  return {
    memory: {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
    },
    uptime: process.uptime(),
    processes: processList
      .filter((p) => p.proc?.pid != null)
      .map((p) => ({ name: p.name, pid: p.proc!.pid ?? null })),
  }
}
