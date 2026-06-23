import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { runPlatiImport } from "../../../../lib/run-plati-import"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const SAFE_WINDOW_MS = 240_000 // 4 min — leaves buffer before 5-min timeout

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 })
  const cronSecret = req.headers.get("x-cron-secret")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await prisma.autoImportSession.findFirst({
    where: { status: "running" },
    orderBy: { updatedAt: "desc" },
  })
  if (!session) return NextResponse.json({ status: "idle" })

  const delayMs = Math.max(5, session.delaySeconds ?? 10) * 1000
  const maxPerBatch = Math.max(1, Math.floor(SAFE_WINDOW_MS / delayMs))
  const batchResults: { platiId: number; status: string; duration: number }[] = []

  for (let i = 0; i < maxPerBatch; i++) {
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
        }
        break
      }
      await prisma.autoImportItem.update({ where: { id: item.id }, data: { status: "processing" } })
      platiId = item.platiId
    } else {
      const nextId = session.currentId || session.startId
      if (nextId > session.endId) {
        await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
        break
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

    batchResults.push({ platiId, status: result.status, duration: result.duration })
    console.log(`[auto-import] #${platiId} => ${result.status} (${result.duration}ms) [${i + 1}/${maxPerBatch}]`)

    // Wait configured delay before next product (skip delay after last item)
    if (i < maxPerBatch - 1) {
      await new Promise<void>(resolve => setTimeout(resolve, delayMs))
    }
  }

  return NextResponse.json({
    processed: batchResults.length,
    delaySeconds: session.delaySeconds,
    results: batchResults,
  })
}