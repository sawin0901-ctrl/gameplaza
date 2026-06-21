import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import { logAdmin } from "../../../../../../lib/admin-log"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { amount: number; operation: "set" | "add" | "sub" }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (typeof body.amount !== "number" || !["set","add","sub"].includes(body.operation)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 422 })
  }
  try {
    const user = body.operation === "set"
      ? await prisma.user.update({ where: { id: params.id }, data: { balance: body.amount }, select: { id: true, balance: true } })
      : body.operation === "add"
      ? await prisma.user.update({ where: { id: params.id }, data: { balance: { increment: body.amount } }, select: { id: true, balance: true } })
      : await prisma.user.update({ where: { id: params.id }, data: { balance: { decrement: body.amount } }, select: { id: true, balance: true } })
    await logAdmin("user.balance", "User", params.id, { operation: body.operation, amount: body.amount, newBalance: user.balance })
    return NextResponse.json({ user })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}