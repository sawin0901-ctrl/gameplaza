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

  const s = await prisma.autoImportSession.findFirst({ orderBy: { updatedAt: "desc" } })
  const logs = s
    ? await prisma.autoImportLog.findMany({
        where: { sessionId: s.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : []
  return NextResponse.json({ session: s, logs })
}