import { ImageResponse } from "next/og"

export const runtime = "edge"

const ALLOWED_IMG_HOSTS = [
  "digiseller.ru", "cdn.digiseller.ru", "graph.digiseller.ru",
  "digiseller.mycdn.ink", "plati.market", "www.plati.market",
  "shop.digiseller.com", "api.digiseller.com",
]

function isSafeImgUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== "https:") return null
    if (ALLOWED_IMG_HOSTS.some(h => hostname === h || hostname.endsWith("." + h))) return url
    // Allow own /uploads/ paths by absolute URL
    const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site").replace(/\/$/, "")
    if (url.startsWith(siteHost + "/uploads/")) return url
  } catch {}
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get("title") ?? "GamePlaza").slice(0, 80)
  const price = searchParams.get("price")
  const imgUrl = isSafeImgUrl(searchParams.get("img"))

  const priceStr = price ? Number(price).toLocaleString("ru-RU") + " руб." : ""

  return new ImageResponse(
    (<div style={{
      width: "1200px", height: "630px",
      display: "flex", flexDirection: "column",
      background: "linear-gradient(135deg, #0f0f13 0%, #1a1a25 50%, #0f0f13 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background accent */}
      <div style={{ position: "absolute", top: "-200px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />

      {/* Content */}
      <div style={{ display: "flex", flex: 1, padding: "60px", gap: "48px", alignItems: "center" }}>

        {/* Product image */}
        {imgUrl && (<div style={{ width: "280px", height: "280px", borderRadius: "20px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
          <img src={imgUrl} width={280} height={280} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </div>)}

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "22px" }}>G</div>
            <span style={{ color: "#a0a0b0", fontSize: "20px", fontWeight: 600 }}>GamePlaza</span>
          </div>

          {/* Product name */}
          <div style={{ color: "white", fontSize: title.length > 40 ? "36px" : "48px", fontWeight: 700, lineHeight: 1.2, marginBottom: "24px", letterSpacing: "-0.5px" }}>
            {title}
          </div>

          {/* Price */}
          {priceStr && (<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "12px", padding: "10px 24px", color: "#818cf8", fontSize: "32px", fontWeight: 700 }}>
              {priceStr}
            </div>
            <div style={{ color: "#10b981", fontSize: "16px", fontWeight: 600 }}>Цифровой товар</div>
          </div>)}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#555570", fontSize: "16px" }}>gameplaza.site</span>
        <span style={{ color: "#555570", fontSize: "16px" }}>Магазин цифровых товаров</span>
      </div>
    </div>),
    { width: 1200, height: 630 }
  )
}