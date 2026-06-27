export interface SeoData {
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  shortDesc: string
}

function buildPrompt(product: { name: string; description?: string | null; price: number; category?: string | null }): string {
  const raw = product.description ?? ""
  const descText = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
  const catStr = product.category ? ", категория: " + product.category : ""
  return "Ты SEO-копирайтер для российского цифрового магазина GamePlaza.\nТовар: \"" + product.name + "\"" + catStr + ", цена: " + product.price + " руб.\nОписание: " + (descText || "цифровой продукт") + "\n\nВерни ТОЛЬКО JSON без пояснений:\n{\"metaTitle\":\"50-60 символов, включи название и купить\",\"metaDescription\":\"140-160 символов с ключевыми словами\",\"metaKeywords\":\"5-8 слов через запятую\",\"shortDesc\":\"1-2 предложения\"}"
}

function parseJson(text: string): SeoData | null {
  try {
    const match = text.match(/\{[\s\S]+\}/)
    if (!match) return null
    const d = JSON.parse(match[0]) as SeoData
    return d?.metaTitle && d?.metaDescription ? d : null
  } catch { return null }
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    })
    if (!res.ok) return null
    const d = await res.json()
    return d.content?.[0]?.text ?? null
  } catch { return null }
}

async function callDeepSeek(prompt: string): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "content-type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ model: "deepseek-chat", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[SEO DeepSeek]", res.status, body.slice(0, 200))
      return null
    }
    const d = await res.json()
    return d.choices?.[0]?.message?.content ?? null
  } catch (e) { console.error("[SEO DeepSeek]", e); return null }
}

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
      }
    )
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[SEO Gemini]", res.status, body.slice(0, 200))
      return null
    }
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch (e) { console.error("[SEO Gemini]", e); return null }
}

async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "content-type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[SEO Groq]", res.status, body.slice(0, 200))
      return null
    }
    const d = await res.json()
    return d.choices?.[0]?.message?.content ?? null
  } catch (e) { console.error("[SEO Groq]", e); return null }
}

async function callCloudflare(prompt: string): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) return null
  try {
    const res = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/run/@cf/meta/llama-3.1-8b-instruct",
      {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiToken, "content-type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 800 }),
      }
    )
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[SEO Cloudflare]", res.status, body.slice(0, 200))
      return null
    }
    const d = await res.json() as Record<string, unknown>
    const result = d.result as Record<string, unknown> | undefined
    const text = (result?.response as string | undefined)
      ?? ((result?.choices as Array<{message?: {content?: string}}> | undefined)?.[0]?.message?.content)
      ?? null
    return typeof text === "string" ? text : null
  } catch (e) { console.error("[SEO Cloudflare]", e); return null }
}

export async function generateSeoForProduct(product: {
  name: string; description?: string | null; price: number; category?: string | null
}): Promise<SeoData | null> {
  const prompt = buildPrompt(product)
  for (const caller of [callCloudflare, callGroq, callDeepSeek, callAnthropic, callGemini]) {
    try {
      const text = await caller(prompt)
      if (!text) continue
      const seo = parseJson(text)
      if (seo) return seo
    } catch { continue }
  }
  return null
}

export async function checkSeoProviders(): Promise<Record<string, boolean>> {
  return {
    cloudflare: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    groq:       !!process.env.GROQ_API_KEY,
    deepseek:   !!process.env.DEEPSEEK_API_KEY,
    anthropic:  !!process.env.ANTHROPIC_API_KEY,
    gemini:     !!process.env.GEMINI_API_KEY,
  }
}