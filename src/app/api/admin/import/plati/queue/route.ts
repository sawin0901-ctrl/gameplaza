import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { importQueue } from "../../../../../../lib/queue"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    importQueue.getWaitingCount(),
    importQueue.getActiveCount(),
    importQueue.getCompletedCount(),
    importQueue.getFailedCount(),
    importQueue.getDelayedCount(),
  ])

  return NextResponse.json({ waiting, active, completed, failed, delayed })
}
