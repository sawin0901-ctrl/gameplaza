import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { runPlatiImport } from "../../../../lib/run-plati-import"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await prisma.autoImportSession.findFirst({
    where: { status: "running" },
    orderBy: { updatedAt: "desc" },
  })
  if (!session) return NextResponse.json({ status: "idle" })

  let platiId: number | null = null

  if (session.mode === "list") {
    const item = await prisma.autoImportItem.findFirst({
      where: { sessionId: session.id, status: "pending" },
      orderBy: { id: "asc" },
    })
    if (!item) {
      const remaining = await prisma.autoImportItem.count({
        where: { sessionId: session.id, status: { in: ["pending", "processing"] } },
      })
      if (remaining === 0) {
        await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
        return NextResponse.json({ status: "completed", sessionId: session.id })
      }
      return NextResponse.json({ status: "waiting" })
    }
    await prisma.autoImportItem.update({ where: { id: item.id }, data: { status: "processing" } })
    platiId = item.platiId
  } else {
    const nextId = session.currentId || session.startId
    if (nextId > session.endId) {
      await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
      return NextResponse.json({ status: "completed", sessionId: session.id })
    }
    await prisma.autoImportSession.update({
      where: { id: session.id },
      data: { currentId: nextId + 1, updatedAt: new Date() },
    })
    platiId = nextId
  }

  const result = await runPlatiImport(platiId)

  if (session.mode === "list") {
    await prisma.autoImportItem.updateMany({
      where: { sessionId: session.id, platiId, status: "processing" },
      data: { status: result.status, processedAt: new Date() },
    })
  }

  const inc: Record<string, { increment: number }> = {}
  if (result.status === "success") inc.doneCount = { increment: 1 }
  else if (result.status === "error") inc.errorCount = { increment: 1 }
  else if (result.status === "skipped") inc.skipCount = { increment: 1 }
  else if (result.status === "duplicate") inc.dupCount = { increment: 1 }

  await prisma.autoImportSession.update({
    where: { id: session.id },
    data: { ...inc, updatedAt: new Date() },
  })

  await prisma.autoImportLog.create({
    data: {
      sessionId: session.id,
      platiId,
      status: result.status,
      productName: result.productName ?? null,
      errorMsg: result.reason ?? null,
      duration: result.duration,
    },
  })

  console.log(`[auto-import] #${platiId} => ${result.status} (${result.duration}ms)`)
  return NextResponse.json({ platiId, ...result })
}