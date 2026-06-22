import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions)
  if (!sess || sess.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const session = await prisma.autoImportSession.findFirst({ where: { status: "paused" } })
  if (!session) return NextResponse.json({ error: "Нет приостановленной сессии" }, { status: 404 })
  await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "running" } })
  return NextResponse.json({ ok: true })
}