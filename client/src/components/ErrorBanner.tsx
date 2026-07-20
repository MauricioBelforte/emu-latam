import React, { useEffect, useRef } from "react"
import styled from "styled-components"

const Banner = styled.div<{ $type: "error" | "warning" | "info" }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 12px 40px 12px 20px;
  font-size: 0.9rem;
  text-align: center;
  color: #fff;
  background: ${(p) =>
    p.$type === "error"
      ? "#c0392b"
      : p.$type === "warning"
        ? "#e67e22"
        : "#2980b9"};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
`

const CloseBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  &:hover { opacity: 1; }
`

interface Props {
  message: string
  type?: "error" | "warning" | "info"
  onDismiss: () => void
  autoDismissMs?: number
}

export function ErrorBanner({ message, type = "error", onDismiss, autoDismissMs = 5000 }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoDismissMs > 0) {
      timerRef.current = setTimeout(onDismiss, autoDismissMs)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, autoDismissMs, onDismiss])

  return (
    <Banner $type={type}>
      {message}
      <CloseBtn onClick={onDismiss}>✕</CloseBtn>
    </Banner>
  )
}
