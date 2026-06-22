import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const body = await req.json()
  const { mode, ids, startId, endId } = body

  const active = await prisma.autoImportSession.findFirst({
    where: { status: { in: ["running", "paused"] } },
  })
  if (active) {
    return NextResponse.json({ error: "Уже есть активная сессия. Сбросьте её перед запуском новой." }, { status: 400 })
  }

  if (mode === "range") {
    const s = parseInt(startId)
    const e = parseInt(endId)
    if (isNaN(s) || isNaN(e) || s > e || s < 1) {
      return NextResponse.json({ error: "Неверный диапазон ID" }, { status: 400 })
    }
    const session = await prisma.autoImportSession.create({
      data: { mode: "range", status: "running", startId: s, endId: e, currentId: s, totalCount: e - s + 1 },
    })
    return NextResponse.json({ ok: true, sessionId: session.id, totalCount: session.totalCount })
  }

  // List mode
  const raw = Array.isArray(ids) ? ids.join("\n") : String(ids ?? "")
  const platiIds: number[] = raw
    .split(/[\s,;\n]+/)
    .map((s: string) => { const m = s.match(/(\d{6,})/); return m ? parseInt(m[1]) : NaN })
    .filter((n: number) => !isNaN(n) && n > 0)
  const unique = [...new Set(platiIds)]
  if (unique.length === 0) {
    return NextResponse.json({ error: "Не найдено ни одного ID товара" }, { status: 400 })
  }

  const session = await prisma.autoImportSession.create({
    data: { mode: "list", status: "running", totalCount: unique.length },
  })

  const BATCH = 500
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH)
    await prisma.autoImportItem.createMany({
      data: batch.map((platiId: number) => ({ sessionId: session.id, platiId })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ ok: true, sessionId: session.id, totalCount: unique.length })
}