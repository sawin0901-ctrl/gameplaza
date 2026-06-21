import { prisma } from "./prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { headers } from "next/headers"

export async function logAdmin(
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return
    const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? headers().get("x-real-ip") ?? null
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id as string ?? "unknown",
        adminEmail: session.user.email ?? "unknown",
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        details: details ? (details as object) : undefined,
        ip,
      },
    })
  } catch {}
}