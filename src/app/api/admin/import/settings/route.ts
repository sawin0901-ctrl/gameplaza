import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { getImportSettings, saveImportSettings } from "../../../../../lib/import-settings"
import { importQueue } from "../../../../../lib/queue"
import { z } from "zod"

const SettingsSchema = z.object({
  markupType: z.enum(["none", "fixed", "percent"]),
  markupValue: z.number().min(0).max(100000),
  markupMinProfit: z.number().min(0).max(100000),
  syncEnabled: z.boolean(),
  syncInterval: z.number().int().min(5).max(1440),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const settings = await getImportSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Ошибка валидации" }, { status: 400 })
  }

  await saveImportSettings(parsed.data)

  // Обновляем BullMQ repeatable jobs для автосинхронизации
  try {
    const repeatableJobs = await importQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.name === "sync-catalog") {
        await importQueue.removeRepeatableByKey(job.key)
      }
    }
    if (parsed.data.syncEnabled) {
      await importQueue.add(
        "sync-catalog",
        {},
        { repeat: { every: parsed.data.syncInterval * 60 * 1000 } }
      )
    }
  } catch {
    // Redis может быть недоступен в dev-режиме, не фатальная ошибка
  }

  return NextResponse.json({ ok: true })
}
