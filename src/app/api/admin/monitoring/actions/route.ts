import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { importQueue } from "../../../../../lib/queue"
import { logInfo } from "../../../../../lib/system-logger"
import { z } from "zod"

const Schema = z.object({
  action: z.enum([
    "restart-queue",
    "clear-failed-jobs",
    "clear-old-logs",
    "clear-old-analytics",
    "test-db",
    "pause-queue",
    "resume-queue",
  ]),
  params: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверное действие" }, { status: 400 })
  }

  const { action } = parsed.data
  const adminEmail = session.user.email ?? "admin"

  switch (action) {
    case "restart-queue": {
      try {
        await importQueue.pause()
        await new Promise(r => setTimeout(r, 500))
        await importQueue.resume()
        await logInfo("queue", `Очередь перезапущена администратором: ${adminEmail}`)
        return NextResponse.json({ ok: true, message: "Очередь успешно перезапущена" })
      } catch (e) {
        return NextResponse.json({ error: `Ошибка перезапуска: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
      }
    }

    case "clear-failed-jobs": {
      try {
        const failed = await importQueue.getFailed()
        await Promise.all(failed.map(j => j.remove()))
        await logInfo("queue", `Очищено ${failed.length} упавших заданий администратором: ${adminEmail}`)
        return NextResponse.json({ ok: true, message: `Удалено ${failed.length} упавших заданий` })
      } catch (e) {
        return NextResponse.json({ error: `Ошибка: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
      }
    }

    case "clear-old-logs": {
      const days = typeof parsed.data.params?.days === "number" ? parsed.data.params.days : 90
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const result = await prisma.systemLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
      await logInfo("system", `Удалено ${result.count} логов старше ${days} дней администратором: ${adminEmail}`)
      return NextResponse.json({ ok: true, message: `Удалено ${result.count} логов старше ${days} дней` })
    }

    case "clear-old-analytics": {
      const days = 90
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const [pv, ev] = await Promise.all([
        prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      ])
      await logInfo("system", `Очищена аналитика старше ${days} дней: ${pv.count} просмотров, ${ev.count} событий`)
      return NextResponse.json({ ok: true, message: `Удалено: ${pv.count} просмотров страниц, ${ev.count} событий аналитики` })
    }

    case "test-db": {
      const start = Date.now()
      try {
        const [products, users, logs] = await Promise.all([
          prisma.product.count(),
          prisma.user.count(),
          prisma.systemLog.count(),
        ])
        return NextResponse.json({
          ok: true,
          message: "База данных работает корректно",
          details: { products, users, logs, responseMs: Date.now() - start },
        })
      } catch (e) {
        return NextResponse.json({ error: `Ошибка БД: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
      }
    }

    case "pause-queue": {
      try {
        await importQueue.pause()
        await logInfo("queue", `Очередь приостановлена администратором: ${adminEmail}`)
        return NextResponse.json({ ok: true, message: "Очередь импорта приостановлена" })
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
      }
    }

    case "resume-queue": {
      try {
        await importQueue.resume()
        await logInfo("queue", `Очередь возобновлена администратором: ${adminEmail}`)
        return NextResponse.json({ ok: true, message: "Очередь импорта возобновлена" })
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 })
  }
}
