import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  const session = await prisma.autoImportSession.findFirst({ where: { status: "running" } })
  if (!session) return NextResponse.json({ error: "Нет активной сессии" }, { status: 404 })
  await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "paused" } })
  return NextResponse.json({ ok: true })
}