import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { rateLimit } from "../../../lib/rate-limit"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!rateLimit(`ai:${session.user.email}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много запросов к AI. Попробуйте через час." }, { status: 429 })
  }

  const { productName, category, price } = await req.json()
  if (!productName) return NextResponse.json({ error: "productName required" }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 })

  const prompt = `Напиши краткое продающее описание (3-4 предложения) для цифрового товара в интернет-магазине.
Товар: "${productName}"
Категория: ${category ?? "Цифровые товары"}
Цена: ${price ?? "не указана"} руб.
Описание должно быть на русском языке, привлекательным, без лишних слов. Не используй markdown.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      }
    )
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    return NextResponse.json({ description: text.trim() })
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
  }
}
