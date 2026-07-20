/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useCallback, useRef } from "react"

export interface Toast {
  id: string
  kind: "info" | "success" | "warning" | "error"
  message: string
  durationMs: number
}

interface ToastContextType {
  toasts: Toast[]
  show: (message: string, kind?: Toast["kind"], durationMs?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  show: () => {},
  dismiss: () => {},
})

let toastCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (message: string, kind: Toast["kind"] = "info", durationMs = 3000) => {
      const id = `toast-${++toastCounter}`
      const toast: Toast = { id, kind, message, durationMs }

      setToasts((prev) => {
        const next = [...prev, toast]
        return next.length > 3 ? next.slice(next.length - 3) : next
      })

      const timer = setTimeout(() => dismiss(id), durationMs)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export default ToastContext
