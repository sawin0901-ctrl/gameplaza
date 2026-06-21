import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isBlocked: true, balance: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  const header = "ID,Имя,Email,Роль,Заблокирован,Баланс,Дата регистрации\n"
  const rows = users.map(u =>
    [u.id, u.name ?? "", u.email, u.role, u.isBlocked ? "Да" : "Нет",
     u.balance.toFixed(2), u.createdAt.toISOString()].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
  ).join("\n")
  return new NextResponse(header + rows, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="users.csv"' },
  })
}