import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import { logAdmin } from "../../../../../../lib/admin-log"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { isBlocked: boolean; reason?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { isBlocked: body.isBlocked },
      select: { id: true, email: true, isBlocked: true },
    })
    await logAdmin(body.isBlocked ? "user.block" : "user.unblock", "User", params.id, { reason: body.reason })
    return NextResponse.json({ user })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}