import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q    = (req.nextUrl.searchParams.get("q") ?? "").trim()
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"))
  const take = 50
  const skip = (page - 1) * take

  const where = q
    ? { OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { name:  { contains: q, mode: "insensitive" as const } },
      ] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        balance: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / take) })
}