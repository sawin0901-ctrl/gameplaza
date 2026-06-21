import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: true })
    const report = body["csp-report"] ?? body
    const blocked = String(report["blocked-uri"] ?? report.blockedURL ?? "unknown").slice(0, 200)
    const directive = String(report["violated-directive"] ?? report.effectiveDirective ?? "unknown").slice(0, 100)
    const docUri = String(report["document-uri"] ?? report.documentURL ?? "").slice(0, 200)
    await prisma.systemLog.create({
      data: {
        level: "warn",
        category: "csp-violation",
        message: `CSP violation: ${directive} — ${blocked}`,
        details: { blocked, directive, docUri, ip: req.headers.get("x-forwarded-for")?.split(",")[0] },
        status: "new",
      },
    }).catch(() => {})
  } catch {}
  return NextResponse.json({ ok: true })
}