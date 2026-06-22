import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

async function auth() {
  const s = await getServerSession(authOptions)
  return s?.user.role === "admin" ? s : null
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const cats = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } })
  return NextResponse.json(cats)
}

export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, slug } = await req.json()
  if (!name || !slug) return NextResponse.json({ error: "Name and slug required" }, { status: 400 })
  const cat = await prisma.category.create({ data: { name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "") } })
  return NextResponse.json(cat)
}

export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, name, slug } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  const cat = await prisma.category.update({ where: { id }, data: { ...(name ? { name } : {}), ...(slug ? { slug } : {}) } })
  return NextResponse.json(cat)
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}