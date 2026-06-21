import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const rateMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    if (rateMap.size > 50_000) {
      for (const [k, v] of rateMap) { if (now > v.resetAt) rateMap.delete(k) }
    }
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone()
    url.host = host.replace(/^www\./, "")
    return NextResponse.redirect(url, { status: 301 })
  }

  const { pathname } = req.nextUrl
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.ip ?? "unknown"
  const isCron = !!process.env.CRON_SECRET && req.headers.get("x-cron-secret") === process.env.CRON_SECRET

  if (!isCron && pathname.startsWith("/api/")) {
    const isAuthSensitive = /^\/api\/auth\/(register|forgot-password|reset-password)/.test(pathname)
      || pathname === "/api/auth/callback/credentials"
    const limit = isAuthSensitive ? 5 : 120
    if (!rateLimit(`${isAuthSensitive ? "auth" : "api"}:${ip}`, limit)) {
      return new NextResponse("Too Many Requests", { status: 429, headers: { "Retry-After": "60" } })
    }
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (pathname.startsWith("/profile")) {
    if (!token) return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  if (pathname.startsWith("/admin")) {
    if (!token) return NextResponse.redirect(new URL("/auth/login", req.url))
    if (token.role !== "admin") return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
}