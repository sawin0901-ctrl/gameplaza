import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { rateLimit } from "../../../../lib/rate-limit"

const BOT_RE = /bot|crawl|spider|slurp|googlebot|bingbot|yandexbot|baiduspider|python|curl|wget|postman|http-client|java\/|go-http|axios\/\d|node-fetch|libwww/i

function parseUA(ua: string) {
  const low = ua.toLowerCase()
  const device = /mobile|android|iphone|blackberry|windows phone/i.test(ua)
    ? /ipad|tablet|kindle|playbook/i.test(ua) ? "tablet" : "mobile"
    : "desktop"

  const browser =
    /edg\//i.test(ua) ? "Edge" :
    /opr\/|opera/i.test(ua) ? "Opera" :
    /chrome/i.test(ua) ? "Chrome" :
    /firefox/i.test(ua) ? "Firefox" :
    /safari/i.test(ua) && !/chrome/i.test(ua) ? "Safari" :
    /trident|msie/i.test(ua) ? "IE" : "Other"

  const os =
    /windows/i.test(ua) ? "Windows" :
    /android/i.test(ua) ? "Android" :
    /iphone|ipad/i.test(ua) ? "iOS" :
    /macintosh|mac os x/i.test(ua) ? "macOS" :
    /linux/i.test(ua) ? "Linux" : "Other"

  return { device, browser, os }
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")

function parseReferrer(referrer?: string, utmSource?: string): {
  referrerType: string; referrerSource: string | null; keyword: string | null
} {
  // UTM overrides referrer classification
  if (utmSource) {
    return { referrerType: "utm", referrerSource: utmSource, keyword: null }
  }

  if (!referrer) return { referrerType: "direct", referrerSource: null, keyword: null }

  try {
    const url = new URL(referrer)
    const host = url.hostname.replace(/^www\./, "")

    // Same site = internal navigation
    if (SITE_URL && referrer.startsWith(SITE_URL)) {
      return { referrerType: "internal", referrerSource: host, keyword: null }
    }

    // Search engines
    const searchMap: [RegExp, string, string][] = [
      [/google\./i, "Google", "q"],
      [/yandex\./i, "Yandex", "text"],
      [/bing\.com/i, "Bing", "q"],
      [/duckduckgo\.com/i, "DuckDuckGo", "q"],
      [/mail\.ru/i, "Mail.ru", "q"],
      [/yahoo\.com/i, "Yahoo", "p"],
    ]
    for (const [re, name, param] of searchMap) {
      if (re.test(host)) {
        return { referrerType: "search", referrerSource: name, keyword: url.searchParams.get(param) }
      }
    }

    // Social networks
    const socialMap: [RegExp, string][] = [
      [/t\.me|telegram\.org/i, "Telegram"],
      [/vk\.com|vkontakte\.ru/i, "VK"],
      [/youtube\.com|youtu\.be/i, "YouTube"],
      [/tiktok\.com/i, "TikTok"],
      [/instagram\.com/i, "Instagram"],
      [/twitter\.com|x\.com/i, "X (Twitter)"],
      [/facebook\.com|fb\.com/i, "Facebook"],
      [/ok\.ru/i, "OK"],
    ]
    for (const [re, name] of socialMap) {
      if (re.test(host)) {
        return { referrerType: "social", referrerSource: name, keyword: null }
      }
    }

    return { referrerType: "referral", referrerSource: host, keyword: null }
  } catch {
    return { referrerType: "direct", referrerSource: null, keyword: null }
  }
}

async function geocodeIp(ip: string): Promise<{ country?: string; city?: string }> {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return { country: "Localhost" }
  }
  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    })
    const d = await res.json()
    if (d.status === "success") return { country: d.country, city: d.city }
  } catch {}
  return {}
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 60 events/min per IP to prevent DB flood
    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0].trim() || "unknown"
    if (!rateLimit(`analytics:${ip}`, 60, 60_000)) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = await req.json()
    const { sessionId, path, referrer, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, duration, _updateOnly } = body

    if (!sessionId || !path) return NextResponse.json({ ok: false }, { status: 400 })

    // Bot check
    const ua = req.headers.get("user-agent") ?? ""
    if (BOT_RE.test(ua)) return NextResponse.json({ ok: false })

    // Duration update only — update last view for this session+path
    if (_updateOnly && duration) {
      await prisma.pageView.updateMany({
        where: { sessionId, path, duration: null },
        data: { duration: Math.min(duration, 3600) },
      }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    const { device, browser, os } = parseUA(ua)
    const { referrerType, referrerSource, keyword } = parseReferrer(referrer, utmSource)

    // Save page view immediately
    const pv = await prisma.pageView.create({
      data: {
        sessionId,
        userId: null, // userId resolved server-side only if session is present
        path,
        referrer: referrer ? referrer.slice(0, 500) : null,
        referrerType,
        referrerSource,
        keyword: keyword?.slice(0, 200) ?? null,
        utmSource: utmSource?.slice(0, 100) ?? null,
        utmMedium: utmMedium?.slice(0, 100) ?? null,
        utmCampaign: utmCampaign?.slice(0, 100) ?? null,
        utmContent: utmContent?.slice(0, 100) ?? null,
        utmTerm: utmTerm?.slice(0, 100) ?? null,
        device,
        browser,
        os,
      },
    })

    // Geocode IP asynchronously (don't await, don't block response)
    if (ip) {
      geocodeIp(ip).then(({ country, city }) => {
        if (country || city) {
          prisma.pageView.update({
            where: { id: pv.id },
            data: { country, city },
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// Track custom events (product_view, add_to_cart, purchase, etc.)
export async function PUT(req: NextRequest) {
  try {
    const ip2 = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0].trim() || "unknown"
    if (!rateLimit(`analytics-ev:${ip2}`, 30, 60_000)) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = await req.json()
    const { sessionId, event, path, productId, orderId, value, meta } = body

    if (!sessionId || !event) return NextResponse.json({ ok: false }, { status: 400 })

    const ua = req.headers.get("user-agent") ?? ""
    if (BOT_RE.test(ua)) return NextResponse.json({ ok: false })

    await prisma.analyticsEvent.create({
      data: {
        sessionId,
        userId: null,
        event,
        path: path?.slice(0, 500) ?? null,
        productId: productId ?? null,
        orderId: orderId ?? null,
        value: value ?? null,
        meta: meta ?? null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
