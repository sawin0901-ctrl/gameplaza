"use client"
import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const

function getOrCreateSession(): string {
  try {
    let sid = sessionStorage.getItem("gp-sid")
    if (!sid) {
      sid = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem("gp-sid", sid)
    }
    return sid
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

function getUtmFromStorage(): Record<string, string> {
  const utm: Record<string, string> = {}
  try {
    for (const k of UTM_KEYS) {
      const v = sessionStorage.getItem(k)
      if (v) utm[k] = v
    }
  } catch {}
  return utm
}

function saveUtmToStorage(params: URLSearchParams) {
  try {
    for (const k of UTM_KEYS) {
      const v = params.get(k)
      if (v) sessionStorage.setItem(k, v)
    }
  } catch {}
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const startTimeRef = useRef(0)
  const sessionRef = useRef("")

  useEffect(() => {
    // Skip bots and headless environments
    if (typeof navigator === "undefined") return
    if (/bot|crawl|spider|slurp|googlebot|bingbot|yandexbot|python|curl|wget|postman/i.test(navigator.userAgent)) return

    const sessionId = getOrCreateSession()
    sessionRef.current = sessionId
    startTimeRef.current = Date.now()

    // Persist UTM params from current URL, fall back to session storage
    saveUtmToStorage(searchParams)
    const utm = getUtmFromStorage()

    const body: Record<string, unknown> = {
      sessionId,
      path: pathname,
      referrer: document.referrer || undefined,
      ...utm,
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})

    // Track duration on page leave
    const sendDuration = () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (duration < 3 || !sessionRef.current) return
      try {
        const blob = new Blob([JSON.stringify({
          sessionId: sessionRef.current,
          path: pathname,
          duration,
          _updateOnly: true,
        })], { type: "application/json" })
        navigator.sendBeacon?.("/api/analytics/track", blob)
      } catch {}
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendDuration()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      sendDuration()
    }
  }, [pathname])

  return null
}

// Utility for tracking custom events (import and call anywhere in client components)
export function trackEvent(event: string, data?: {
  productId?: string; orderId?: string; value?: number; path?: string; meta?: unknown
}) {
  try {
    const sessionId = sessionStorage.getItem("gp-sid")
    if (!sessionId) return
    fetch("/api/analytics/track", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event, ...data }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
