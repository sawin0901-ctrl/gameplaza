import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { generateSeoForProduct, checkSeoProviders } from "../../../../../lib/seo-generator"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { batchSize = 10, force = false } = await req.json().catch(() => ({}))
    const safe = Math.min(Math.max(1, Number(batchSize)), 50)

    const providers = await checkSeoProviders()
    const hasProvider = Object.values(providers).some(Boolean)
    if (!hasProvider) {
      return NextResponse.json({
        processed: 0, updated: 0, errors: 0,
        errorMsg: "Нет API-ключей. Добавьте GEMINI_API_KEY, ANTHROPIC_API_KEY или DEEPSEEK_API_KEY в .env на сервере.",
        providers,
      })
    }

    const products = await prisma.product.findMany({
      where: force ? {} : { metaTitle: null },
      select: { id: true, name: true, description: true, price: true, category: { select: { name: true } } },
      take: safe,
      orderBy: { updatedAt: "desc" },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
        }

        let updated = 0
        let errors = 0
        const failedNames: string[] = []
        let consecutiveFails = 0
        let processed = 0
        const total = products.length

        const CONCURRENCY = 3
        for (let i = 0; i < products.length; i += CONCURRENCY) {
          if (consecutiveFails >= 10) {
            errors += products.length - i
            processed = products.length
            break
          }
          const chunk = products.slice(i, i + CONCURRENCY)
          const results = await Promise.allSettled(
            chunk.map(p => generateSeoForProduct({
              name: p.name,
              description: p.description,
              price: Number(p.price),
              category: p.category?.name ?? null,
            }))
          )
          for (let j = 0; j < chunk.length; j++) {
            const p = chunk[j]
            const r = results[j]
            if (r.status === "fulfilled" && r.value) {
              try {
                await prisma.product.update({
                  where: { id: p.id },
                  data: {
                    metaTitle: r.value.metaTitle,
                    metaDescription: r.value.metaDescription,
                    metaKeywords: r.value.metaKeywords,
                    shortDesc: r.value.shortDesc || undefined,
                  },
                })
                updated++
                consecutiveFails = 0
              } catch { errors++; consecutiveFails++ }
            } else {
              errors++
              consecutiveFails++
              failedNames.push(p.name.slice(0, 25))
            }
            processed++
          }

          send({ processed, updated, errors, total, done: false })

          if (i + CONCURRENCY < products.length) await new Promise(r => setTimeout(r, 200))
        }

        const aborted = consecutiveFails >= 10 && errors > 0
        send({
          processed,
          updated,
          errors,
          total,
          providers,
          failedNames: failedNames.slice(0, 5),
          done: true,
          errorMsg: aborted ? "Остановлено: 5 последовательных ошибок API. Проверьте ключи и подключение." : undefined,
        })
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ошибка" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const [total, withSeo, withoutSeo] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { metaTitle: { not: null } } }),
      prisma.product.count({ where: { metaTitle: null } }),
    ])
    const providers = await checkSeoProviders()
    return NextResponse.json({ total, withSeo, withoutSeo, providers })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ошибка" }, { status: 500 })
  }
}
