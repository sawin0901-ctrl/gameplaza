import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { runPlatiImport } from "../../../../lib/run-plati-import"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Cron fires every 60s. Each batch must finish in ~55s to avoid concurrent overlapping runs.
// maxPerBatch = floor(55s / delaySeconds) — e.g. 10s delay => 5 items/batch.
const CRON_INTERVAL_MS = 60_000
const LOCK_MARGIN_MS   = 5_000  // safety buffer

async function processOne(sessionId: string, platiId: number) {
  const result = await runPlatiImport(platiId)
  const inc: Record<string, { increment: number }> = {}
  if (result.status === "success")   inc.doneCount  = { increment: 1 }
  else if (result.status === "error")    inc.errorCount = { increment: 1 }
  else if (result.status === "skipped")  inc.skipCount  = { increment: 1 }
  else if (result.status === "duplicate") inc.dupCount  = { increment: 1 }
  await prisma.autoImportSession.update({ where: { id: sessionId }, data: { ...inc, updatedAt: new Date() } })
  await prisma.autoImportLog.create({
    data: { sessionId, platiId, status: result.status,
      productName: result.productName ?? null, errorMsg: result.reason ?? null, duration: result.duration },
  })
  console.log(`[auto-import] #${platiId} => ${result.status} (${result.duration}ms)`)
  return result
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 })
  const cronSecret = req.headers.get("x-cron-secret")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await prisma.autoImportSession.findFirst({
    where: { status: "running" },
    orderBy: { updatedAt: "desc" },
  })
  if (!session) return NextResponse.json({ status: "idle" })

  const delayMs = Math.max(5, session.delaySeconds ?? 10) * 1000
  // How many items fit in one cron window (55s), accounting for the delay between items
  const maxPerBatch = Math.max(1, Math.floor((CRON_INTERVAL_MS - LOCK_MARGIN_MS) / delayMs))

  // ── LOCK: skip if a batch started recently (within one cron window) ──
  const lockWindow = maxPerBatch * delayMs + 10_000 // expected batch duration + 10s buffer
  const timeSinceUpdate = Date.now() - new Date(session.updatedAt).getTime()
  if (timeSinceUpdate < lockWindow - CRON_INTERVAL_MS - 2000 && timeSinceUpdate > 2000) {
    // updatedAt was touched < (lockWindow - 60s) ago: another batch is still in progress
    return NextResponse.json({ status: "locked", nextIn: Math.ceil((lockWindow - timeSinceUpdate) / 1000) + "s" })
  }

  const batchResults: { platiId: number; status: string }[] = []

  if (session.mode === "range") {
    const batchStart = session.currentId || session.startId
    if (batchStart > session.endId) {
      await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
      return NextResponse.json({ status: "completed" })
    }
    const batchEnd = Math.min(batchStart + maxPerBatch - 1, session.endId)
    // Atomically advance currentId so next cron call picks up after this batch
    await prisma.autoImportSession.update({
      where: { id: session.id },
      data: { currentId: batchEnd + 1, updatedAt: new Date() },
    })
    for (let platiId = batchStart; platiId <= batchEnd; platiId++) {
      const result = await processOne(session.id, platiId)
      batchResults.push({ platiId, status: result.status })
      if (platiId < batchEnd) await new Promise<void>(res => setTimeout(res, delayMs))
    }
  } else {
    for (let i = 0; i < maxPerBatch; i++) {
      // find + claim atomically using updateMany with status=pending filter
      const item = await prisma.autoImportItem.findFirst({
        where: { sessionId: session.id, status: "pending" },
        orderBy: { id: "asc" },
      })
      if (!item) {
        const remaining = await prisma.autoImportItem.count({
          where: { sessionId: session.id, status: { in: ["pending", "processing"] } },
        })
        if (remaining === 0)
          await prisma.autoImportSession.update({ where: { id: session.id }, data: { status: "completed" } })
        break
      }
      // Mark as processing (prevents duplicate pick-up by concurrent calls)
      const claimed = await prisma.autoImportItem.updateMany({
        where: { id: item.id, status: "pending" },
        data: { status: "processing" },
      })
      if (claimed.count === 0) { i--; continue } // another worker claimed it, retry
      const result = await processOne(session.id, item.platiId)
      await prisma.autoImportItem.updateMany({
        where: { sessionId: session.id, platiId: item.platiId, status: "processing" },
        data: { status: result.status, processedAt: new Date() },
      })
      batchResults.push({ platiId: item.platiId, status: result.status })
      if (i < maxPerBatch - 1) await new Promise<void>(res => setTimeout(res, delayMs))
    }
  }

  return NextResponse.json({ processed: batchResults.length, delaySeconds: session.delaySeconds, maxPerBatch, results: batchResults })
}