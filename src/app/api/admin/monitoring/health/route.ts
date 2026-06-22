import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { importQueue, connection } from "../../../../../lib/queue"
import os from "os"

export const dynamic = "force-dynamic"

interface CheckResult {
  name: string
  status: "ok" | "warn" | "error" | "unknown"
  message: string
  value?: string | number
  duration?: number
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - start
    return {
      name: "База данных (PostgreSQL)",
      status: duration > 2000 ? "warn" : "ok",
      message: duration > 2000 ? "Медленный ответ" : "Работает нормально",
      duration,
    }
  } catch (e) {
    return {
      name: "База данных (PostgreSQL)",
      status: "error",
      message: `Ошибка подключения: ${e instanceof Error ? e.message : String(e)}`,
      duration: Date.now() - start,
    }
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const counts = await withTimeout(importQueue.getJobCounts(), 4000, null)
    if (!counts) throw new Error("Timeout")
    const duration = Date.now() - start
    return {
      name: "Redis / Очередь (BullMQ)",
      status: "ok",
      message: `Ожидают: ${counts.waiting}, активных: ${counts.active}, выполнено: ${counts.completed}`,
      value: `${counts.waiting} в очереди`,
      duration,
    }
  } catch (e) {
    return {
      name: "Redis / Очередь (BullMQ)",
      status: "error",
      message: `Не отвечает: ${e instanceof Error ? e.message : String(e)}`,
      duration: Date.now() - start,
    }
  }
}

async function checkDigiseller(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await withTimeout(
      fetch("https://api.digiseller.ru/", {
        signal: AbortSignal.timeout(8000),
        method: "HEAD",
      }),
      9000,
      null
    )
    const duration = Date.now() - start
    if (!res) throw new Error("Timeout (>8с)")
    if (!res.ok && res.status !== 404 && res.status !== 405) {
      return { name: "Digiseller API", status: "warn", message: `HTTP ${res.status}`, duration }
    }
    return {
      name: "Digiseller API",
      status: duration > 5000 ? "warn" : "ok",
      message: duration > 5000 ? "Медленный ответ" : "Доступен",
      duration,
    }
  } catch (e) {
    return {
      name: "Digiseller API",
      status: "error",
      message: `Недоступен: ${e instanceof Error ? e.message : String(e)}`,
      duration: Date.now() - start,
    }
  }
}

async function checkSmtp(): Promise<CheckResult> {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT

  if (!host) {
    return { name: "SMTP (почта)", status: "warn", message: "SMTP_HOST не настроен в .env" }
  }

  const start = Date.now()
  try {
    const net = await import("net")
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection(parseInt(port ?? "587"), host)
      const timer = setTimeout(() => { socket.destroy(); reject(new Error("Timeout")) }, 5000)
      socket.on("connect", () => { clearTimeout(timer); socket.destroy(); resolve() })
      socket.on("error", (err) => { clearTimeout(timer); reject(err) })
    })
    return {
      name: "SMTP (почта)",
      status: "ok",
      message: `${host}:${port ?? 587} — соединение успешно`,
      duration: Date.now() - start,
    }
  } catch (e) {
    return {
      name: "SMTP (почта)",
      status: "error",
      message: `Не удаётся подключиться к ${host}:${port ?? 587}: ${e instanceof Error ? e.message : String(e)}`,
      duration: Date.now() - start,
    }
  }
}

async function checkDisk(): Promise<CheckResult> {
  try {
    const { statfs } = await import("fs/promises")
    const stats = await (statfs as (path: string) => Promise<{ blocks: bigint; bfree: bigint; bsize: bigint }>)("/var/www/gameplaza").catch(
      () => (statfs as (path: string) => Promise<{ blocks: bigint; bfree: bigint; bsize: bigint }>)("/")
    )
    const total = Number(stats.blocks) * Number(stats.bsize)
    const free = Number(stats.bfree) * Number(stats.bsize)
    const usedPct = Math.round(((total - free) / total) * 100)
    const freeGB = (free / 1024 / 1024 / 1024).toFixed(1)
    return {
      name: "Место на диске",
      status: usedPct > 90 ? "error" : usedPct > 75 ? "warn" : "ok",
      message: `Занято ${usedPct}%, свободно ${freeGB} ГБ`,
      value: `${freeGB} ГБ свободно`,
    }
  } catch {
    // Fallback for older Node
    try {
      const { exec } = await import("child_process")
      const { promisify } = await import("util")
      const execAsync = promisify(exec)
      const { stdout: out } = await execAsync("df -BG / | tail -1", { timeout: 3000 })
      const parts = out.trim().split(/\s+/)
      return {
        name: "Место на диске",
        status: "ok",
        message: `Размер: ${parts[1]}, занято: ${parts[2]}, свободно: ${parts[3]} (${parts[4]})`,
        value: parts[3],
      }
    } catch {
      return { name: "Место на диске", status: "unknown", message: "Не удалось получить данные" }
    }
  }
}

function checkSystem(): CheckResult[] {
  const freeMem = os.freemem()
  const totalMem = os.totalmem()
  const usedMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100)
  const loadAvg = os.loadavg()
  const cpuCount = os.cpus().length
  const load1 = loadAvg[0].toFixed(2)
  const loadPct = Math.round((loadAvg[0] / cpuCount) * 100)
  const uptimeHours = Math.round(os.uptime() / 3600)

  return [
    {
      name: "Оперативная память",
      status: usedMemPct > 90 ? "error" : usedMemPct > 75 ? "warn" : "ok",
      message: `Занято ${usedMemPct}%, свободно ${(freeMem / 1024 / 1024).toFixed(0)} МБ из ${(totalMem / 1024 / 1024).toFixed(0)} МБ`,
      value: `${usedMemPct}% занято`,
    },
    {
      name: "Нагрузка CPU",
      status: loadPct > 90 ? "error" : loadPct > 70 ? "warn" : "ok",
      message: `Load avg 1m: ${load1} (${loadPct}% из ${cpuCount} ядер), 5m: ${loadAvg[1].toFixed(2)}, 15m: ${loadAvg[2].toFixed(2)}`,
      value: `${loadPct}%`,
    },
    {
      name: "Время работы сервера",
      status: "ok",
      message: `${uptimeHours} часов без перезагрузки`,
      value: `${uptimeHours}ч`,
    },
  ]
}

async function checkSitePages(): Promise<CheckResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const pages = [
    { path: "/", name: "Главная" },
    { path: "/catalog", name: "Каталог" },
    { path: "/api/health", name: "Health API" },
  ]

  return Promise.all(pages.map(async (page) => {
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl}${page.path}`, {
        signal: AbortSignal.timeout(12000),
        headers: { "x-internal-check": "1" },
      })
      const duration = Date.now() - start
      return {
        name: `Страница: ${page.name}`,
        status: !res.ok ? "error" : duration > 5000 ? "warn" : "ok",
        message: !res.ok ? `HTTP ${res.status}` : `${duration}мс`,
        duration,
      } as CheckResult
    } catch (e) {
      return {
        name: `Страница: ${page.name}`,
        status: "error" as const,
        message: `Не отвечает: ${e instanceof Error ? e.message : String(e)}`,
        duration: Date.now() - start,
      }
    }
  }))
}

async function checkQueueWorker(): Promise<CheckResult> {
  try {
    const workers = await withTimeout(importQueue.getWorkers(), 4000, null)
    if (!workers) throw new Error("Timeout")
    if (workers.length === 0) {
      return {
        name: "Воркер импорта",
        status: "warn",
        message: "Нет активных воркеров. Запустите: pm2 start ecosystem.config.js",
      }
    }
    return {
      name: "Воркер импорта",
      status: "ok",
      message: `${workers.length} воркер(ов) активно`,
      value: workers.length,
    }
  } catch (e) {
    return {
      name: "Воркер импорта",
      status: "error",
      message: `Ошибка проверки: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()

  const [db, redis, digiseller, smtp, disk, sitePages, worker] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkDigiseller(),
    checkSmtp(),
    checkDisk(),
    checkSitePages(),
    checkQueueWorker(),
  ])

  const system = checkSystem()

  const checks: CheckResult[] = [
    db, redis, digiseller, smtp, disk, worker,
    ...system, ...sitePages,
  ]

  const errorCount = checks.filter(c => c.status === "error").length
  const warnCount = checks.filter(c => c.status === "warn").length
  const overall = errorCount > 0 ? "error" : warnCount > 0 ? "warn" : "ok"

  return NextResponse.json({
    overall,
    errorCount,
    warnCount,
    okCount: checks.filter(c => c.status === "ok").length,
    checks,
    duration: Date.now() - startTime,
    checkedAt: new Date().toISOString(),
  })
}
