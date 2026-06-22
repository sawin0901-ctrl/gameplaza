import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  await prisma.autoImportSession.deleteMany({})
  return NextResponse.json({ ok: true })
}