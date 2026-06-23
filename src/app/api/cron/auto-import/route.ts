import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { runPlatiImport } from "../../../../lib/run-plati-import"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const SAFE_WINDOW_MS = 240_000

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

  if (session.mode === "range") {
    // Atomically claim the entire batch range upfront to prevent concurrent cron overlap
    const batchStart = session.currentId || session.startId
    if (batchStart > session.endId) {
      await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
      return NextResponse.json({ status: "completed" })
    }
    const batchEnd = Math.min(batchStart + maxPerBatch - 1, session.endId)
    // Claim the range — next cron call will start from batchEnd + 1
    await prisma.autoImportSession.update({
      where: { id: session.id },
      data: { currentId: batchEnd + 1, updatedAt: new Date() },
    })

    for (let platiId = batchStart; platiId <= batchEnd; platiId++) {
      const result = await runPlatiImport(platiId)
      const inc: Record<string, { increment: number }> = {}
      if (result.status === "success") inc.doneCount = { increment: 1 }
      else if (result.status === "error") inc.errorCount = { increment: 1 }
      else if (result.status === "skipped") inc.skipCount = { increment: 1 }
      else if (result.status === "duplicate") inc.dupCount = { increment: 1 }
      await prisma.autoImportSession.update({ where: { id: session.id }, data: { ...inc, updatedAt: new Date() } })
      await prisma.autoImportLog.create({
        data: { sessionId: session.id, platiId, status: result.status,
          productName: result.productName ?? null, errorMsg: result.reason ?? null, duration: result.duration },
      })
      batchResults.push({ platiId, status: result.status, duration: result.duration })
      console.log(`[auto-import] range #${platiId} => ${result.status} (${result.duration}ms)`)
      if (platiId < batchEnd) await new Promise<void>(r => setTimeout(r, delayMs))
    }
  } else {
    // List mode: process one item at a time (items are marked "processing" to prevent duplicates)
    for (let i = 0; i < maxPerBatch; i++) {
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
      const result = await runPlatiImport(item.platiId)
      await prisma.autoImportItem.updateMany({
        where: { sessionId: session.id, platiId: item.platiId, status: "processing" },
        data: { status: result.status, processedAt: new Date() },
      })
      const inc: Record<string, { increment: number }> = {}
      if (result.status === "success") inc.doneCount = { increment: 1 }
      else if (result.status === "error") inc.errorCount = { increment: 1 }
      else if (result.status === "skipped") inc.skipCount = { increment: 1 }
      else if (result.status === "duplicate") inc.dupCount = { increment: 1 }
      await prisma.autoImportSession.update({ where: { id: session.id }, data: { ...inc, updatedAt: new Date() } })
      await prisma.autoImportLog.create({
        data: { sessionId: session.id, platiId: item.platiId, status: result.status,
          productName: result.productName ?? null, errorMsg: result.reason ?? null, duration: result.duration },
      })
      batchResults.push({ platiId: item.platiId, status: result.status, duration: result.duration })
      console.log(`[auto-import] list #${item.platiId} => ${result.status} (${result.duration}ms)`)
      if (i < maxPerBatch - 1) await new Promise<void>(r => setTimeout(r, delayMs))
    }
  }

  return NextResponse.json({ processed: batchResults.length, delaySeconds: session.delaySeconds, results: batchResults })
}