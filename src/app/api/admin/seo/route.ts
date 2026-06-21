import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const [settings, categories] = await Promise.all([
      prisma.systemSetting.findMany({ where: { key: { startsWith: "seo." } } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true, metaTitle: true, metaDesc: true } }),
    ])
    const global = Object.fromEntries(settings.map(s => [s.key.replace("seo.", ""), s.value]))
    return NextResponse.json({ global, categories })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { type: "global" | "category"; key?: string; value?: string; categoryId?: string; metaTitle?: string; metaDesc?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  try {
    if (body.type === "global" && body.key) {
      await prisma.systemSetting.upsert({ where: { key: "seo." + body.key }, update: { value: body.value ?? "" }, create: { key: "seo." + body.key, value: body.value ?? "" } })
      await logAdmin("seo.update_global", "SystemSetting", body.key, { value: body.value })
    } else if (body.type === "category" && body.categoryId) {
      await prisma.category.update({ where: { id: body.categoryId }, data: { metaTitle: body.metaTitle, metaDesc: body.metaDesc } })
      await logAdmin("seo.update_category", "Category", body.categoryId)
    }
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}