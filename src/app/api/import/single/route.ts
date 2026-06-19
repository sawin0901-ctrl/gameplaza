import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { scheduleImport } from "../../../../../lib/queue"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json() as { ids: number[] }
  if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 })

  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: ids } },
    select: { digisellerProductId: true, name: true, isActive: true },
  })
  const existingMap = new Map(existing.map(e => [e.digisellerProductId, e]))

  const toImport = ids.filter(id => !existingMap.has(id))
  const alreadyExists = ids.filter(id => existingMap.has(id))

  for (const id of toImport) {
    await scheduleImport(id, 10)
  }

  return NextResponse.json({
    scheduled: toImport.length,
    alreadyExists: alreadyExists.map(id => ({
      id,
      name: existingMap.get(id)?.name,
      active: existingMap.get(id)?.isActive,
    })),
  })
}
