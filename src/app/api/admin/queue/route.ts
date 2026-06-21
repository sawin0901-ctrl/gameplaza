import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"

export const dynamic = "force-dynamic"

function getConnection() {
  const url = process.env.REDIS_URL ?? ""
  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    return { url }
  }
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { Queue } = await import("bullmq")
    const connection = getConnection()
    const queue = new Queue("product-import", { connection })
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(), queue.getActiveCount(),
      queue.getCompletedCount(), queue.getFailedCount(), queue.getDelayedCount(),
    ])
    const failedJobs = await queue.getFailed(0, 9)
    await queue.close()
    return NextResponse.json({
      ok: true, waiting, active, completed, failed, delayed,
      failedJobs: failedJobs.map(j => ({
        id: j.id, name: j.name, data: j.data,
        failedReason: j.failedReason, attemptsMade: j.attemptsMade,
        timestamp: j.timestamp,
      })),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { Queue } = await import("bullmq")
    const connection = getConnection()
    const queue = new Queue("product-import", { connection })
    await queue.clean(0, 1000, "failed")
    await queue.clean(0, 1000, "completed")
    await queue.close()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}