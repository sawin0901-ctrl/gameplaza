import { prisma } from "./prisma"

export type LogLevel = "error" | "warn" | "info" | "debug"
export type LogCategory =
  | "digiseller"
  | "import"
  | "auth"
  | "smtp"
  | "worker"
  | "db"
  | "server"
  | "cron"
  | "payment"
  | "queue"
  | "system"

export async function systemLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: unknown,
  extra?: { url?: string; userId?: string }
): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        category,
        message: message.slice(0, 1000),
        details: details !== undefined
          ? (typeof details === "object" ? details as object : { raw: String(details) })
          : undefined,
        url: extra?.url?.slice(0, 500),
        userId: extra?.userId,
      },
    })
  } catch (e) {
    // Avoid infinite loop if DB itself is down
    console.error("[SystemLogger] Could not write log:", level, category, message, e)
  }
}

export async function logError(
  category: LogCategory,
  message: string,
  err?: unknown,
  extra?: { url?: string; userId?: string }
) {
  const details = err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack?.slice(0, 2000) }
    : err !== undefined ? { raw: String(err) } : undefined
  await systemLog("error", category, message, details, extra)
}

export async function logWarn(
  category: LogCategory,
  message: string,
  details?: unknown,
  extra?: { url?: string; userId?: string }
) {
  await systemLog("warn", category, message, details, extra)
}

export async function logInfo(
  category: LogCategory,
  message: string,
  details?: unknown,
) {
  await systemLog("info", category, message, details)
}
