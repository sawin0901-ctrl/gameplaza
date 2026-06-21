import { NextResponse } from "next/server"

export const revalidate = 3600

export async function GET() {
  try {
    const [cbrRes, btcRes] = await Promise.all([
      fetch("https://www.cbr-xml-daily.ru/daily_json.js", { next: { revalidate: 3600 } }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=rub,usd", { next: { revalidate: 3600 } }),
    ])
    const [cbr, btc] = await Promise.all([cbrRes.json(), btcRes.json()])
    return NextResponse.json({
      usd: cbr?.Valute?.USD?.Value ?? null,
      eur: cbr?.Valute?.EUR?.Value ?? null,
      btcRub: btc?.bitcoin?.rub ?? null,
      btcUsd: btc?.bitcoin?.usd ?? null,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } })
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}