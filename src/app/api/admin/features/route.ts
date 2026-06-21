import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

const PREFIX = "feature."

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const settings = await prisma.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } })
    const flags = settings.map(s => ({ key: s.key.replace(PREFIX, ""), enabled: s.value === "true", updatedAt: s.updatedAt }))
    return NextResponse.json({ flags })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { key: string; enabled: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.key) return NextResponse.json({ error: "Missing key" }, { status: 422 })
  const dbKey = PREFIX + body.key.replace(/[^a-z0-9_-]/gi, "_")
  try {
    await prisma.systemSetting.upsert({ where: { key: dbKey }, update: { value: String(body.enabled) }, create: { key: dbKey, value: String(body.enabled) } })
    await logAdmin("feature.toggle", "SystemSetting", dbKey, { enabled: body.enabled })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const key = req.nextUrl.searchParams.get("key")
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })
  try {
    await prisma.systemSetting.delete({ where: { key: PREFIX + key } })
    await logAdmin("feature.delete", "SystemSetting", key)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}