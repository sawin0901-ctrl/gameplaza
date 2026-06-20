"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ background: "#0a0a0f", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              Что-то пошло не так
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
              Произошла неожиданная ошибка. Мы уже знаем о ней.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}
              >
                Попробовать снова
              </button>
              <a href="/"
                style={{ background: "transparent", color: "#9ca3af", border: "1px solid #1f2937", padding: "10px 24px", borderRadius: 10, fontSize: 14, textDecoration: "none" }}
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
