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
    const items = await prisma.fAQItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] })
    return NextResponse.json({ items })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { question: string; answer: string; category?: string; sortOrder?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.question?.trim() || !body.answer?.trim()) return NextResponse.json({ error: "question и answer обязательны" }, { status: 422 })
  try {
    const item = await prisma.fAQItem.create({ data: { question: body.question.trim(), answer: body.answer.trim(), category: body.category ?? "general", sortOrder: body.sortOrder ?? 0 } })
    await logAdmin("faq.create", "FAQItem", item.id)
    return NextResponse.json({ item }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка создания" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; question?: string; answer?: string; category?: string; isActive?: boolean; sortOrder?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 422 })
  try {
    const item = await prisma.fAQItem.update({ where: { id: body.id }, data: { question: body.question, answer: body.answer, category: body.category, isActive: body.isActive, sortOrder: body.sortOrder } })
    await logAdmin("faq.update", "FAQItem", body.id)
    return NextResponse.json({ item })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.fAQItem.delete({ where: { id } })
    await logAdmin("faq.delete", "FAQItem", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}