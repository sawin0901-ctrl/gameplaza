import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const page = Math.max(1, Math.min(10000, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1))
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const status = req.nextUrl.searchParams.get("status") ?? "all"
  const PAGE = 50

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
  }
    param($m)
    $m.Groups[1].Value + "try {`n" + $m.Groups[1].Value + "  " + $m.Groups[2].Value.Trim() + "`n" + $m.Groups[1].Value + "  " + $m.Groups[3].Value.Trim()
  { products, total, pages: Math.ceil(total / PAGE) })
}
