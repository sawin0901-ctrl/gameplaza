import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  // 301: redirect www.gameplaza.site → gameplaza.site
  const host = req.headers.get("host") ?? ""
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone()
    url.host = host.replace(/^www\./, "")
    return NextResponse.redirect(url, { status: 301 })
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

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
