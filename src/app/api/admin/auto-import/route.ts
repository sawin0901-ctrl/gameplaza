import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const session = await prisma.autoImportSession.findFirst({
    orderBy: { updatedAt: "desc" },
  })

  const logs = session
    ? await prisma.autoImportLog.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : []

  return NextResponse.json({ session, logs })
}