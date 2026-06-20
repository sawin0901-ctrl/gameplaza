import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { scheduleImport } from "../../../../lib/queue"
import { prisma } from "../../../../lib/prisma"
import { z } from "zod"

const Schema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "ids должен быть массивом целых чисел (1–50)" }, { status: 400 })
  }
  const { ids } = parsed.data

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
