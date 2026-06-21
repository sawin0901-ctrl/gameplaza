export interface SeoData {
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  shortDesc: string
}

export async function generateSeoForProduct(product: {
  name: string; description: string; price: number; category?: string | null
}): Promise<SeoData | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const descText = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600)
  const catStr = product.category ? `, категория: ${product.category}` : ""

  const prompt = `Ты SEO-копирайтер для российского цифрового магазина GamePlaza.
Товар: "${product.name}"${catStr}, цена: ${product.price} ₽.
Краткое описание: ${descText}

Верни ТОЛЬКО JSON без пояснений:
{
  "metaTitle": "title для поиска, 50-60 символов, включи название товара и купить",
  "metaDescription": "мета-описание 140-160 символов с ключевыми словами и ценой",
  "metaKeywords": "ключевые слова через запятую, 5-8 штук",
  "shortDesc": "короткое описание товара 1-2 предложения для карточки"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const match = text.match(/\{[\s\S]+\}/)
    if (!match) return null
    return JSON.parse(match[0]) as SeoData
  } catch {
    return null
  }
}