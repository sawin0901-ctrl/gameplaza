export interface SeoData {
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  shortDesc: string
}

function buildPrompt(product: { name: string; description: string; price: number; category?: string | null }): string {
  const descText = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600)
  const catStr = product.category ? `, категория: ${product.category}` : ""
  return `Ты SEO-копирайтер для российского цифрового магазина GamePlaza.
Товар: "${product.name}"${catStr}, цена: ${product.price} ₽.
Краткое описание: ${descText}

Верни ТОЛЬКО JSON (без пояснений, без markdown):
{
  "metaTitle": "title 50-60 символов, включи название и слово купить",
  "metaDescription": "мета-описание 140-160 символов с ключевыми словами и ценой",
  "metaKeywords": "5-8 ключевых слов через запятую",
  "shortDesc": "короткое описание 1-2 предложения для карточки товара"
}`
}

function parseJson(text: string): SeoData | null {
  try {
    const match = text.match(/\{[\s\S]+\}/)
    return match ? JSON.parse(match[0]) as SeoData : null
  } catch { return null }
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d.content?.[0]?.text ?? null
}

async function callDeepSeek(prompt: string): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) return null
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ model: "deepseek-chat", max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d.choices?.[0]?.message?.content ?? null
}

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 512 } }),
    }
  )
  if (!res.ok) return null
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

export async function generateSeoForProduct(product: {
  name: string; description: string; price: number; category?: string | null
}): Promise<SeoData | null> {
  const prompt = buildPrompt(product)
  // Try providers in order: Anthropic → DeepSeek → Gemini
  for (const caller of [callAnthropic, callDeepSeek, callGemini]) {
    try {
      const text = await caller(prompt)
      if (!text) continue
      const seo = parseJson(text)
      if (seo) return seo
    } catch { continue }
  }
  return null
}