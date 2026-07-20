import React from "react"
import styled, { keyframes } from "styled-components"
import { useToast, type Toast } from "../context/ToastContext"

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const Container = styled.div`
  position: fixed;
  top: 60px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`

const ToastItem = styled.div<{ $kind: Toast["kind"] }>`
  pointer-events: auto;
  padding: 10px 16px;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
  font-family: "Inter", sans-serif;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: ${slideIn} 0.25s ease-out;
  cursor: pointer;
  background: ${(p) =>
    p.$kind === "success"
      ? "#27ae60"
      : p.$kind === "error"
        ? "#c0392b"
        : p.$kind === "warning"
          ? "#e67e22"
          : "#2980b9"};
  border-left: 4px solid
    ${(p) =>
      p.$kind === "success"
        ? "#2ecc71"
        : p.$kind === "error"
          ? "#e74c3c"
          : p.$kind === "warning"
            ? "#f39c12"
            : "#3498db"};
`

export function ToastHost() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <Container>
      {toasts.map((t) => (
        <ToastItem key={t.id} $kind={t.kind} onClick={() => dismiss(t.id)}>
          {t.message}
        </ToastItem>
      ))}
    </Container>
  )
}
