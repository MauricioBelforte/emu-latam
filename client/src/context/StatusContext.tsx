/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, useRef } from "react"

export interface SystemMetrics {
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number }
  uptime: number
  processes: { name: string; pid: number | null }[]
}

export interface DepResult {
  name: string
  path: string
  exists: boolean
}

export interface ServiceStatus {
  nakama: "running" | "stopped" | "error"
  bore: "running" | "stopped" | "error"
  retroarch: "running" | "stopped" | "error"
  metrics: SystemMetrics | null
  dependencies: DepResult[]
}

const defaultStatus: ServiceStatus = {
  nakama: "stopped",
  bore: "stopped",
  retroarch: "stopped",
  metrics: null,
  dependencies: [],
}

const StatusContext = createContext<ServiceStatus>(defaultStatus)

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ServiceStatus>(defaultStatus)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const electron = (window as Record<string, any>).electron
        if (electron?.getStatus) {
          const s = await electron.getStatus()
          setStatus(s)
        }
      } catch {
        // silently ignore polling errors
      }
    }
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
}

export function useServiceStatus() {
  return useContext(StatusContext)
}

export default StatusContext
