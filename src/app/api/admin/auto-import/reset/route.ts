import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions)
  if (!sess || sess.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await prisma.autoImportSession.deleteMany({})
  return NextResponse.json({ ok: true })
}