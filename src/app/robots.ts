import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gameplaza.site"
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog", "/product/", "/about", "/help"],
        disallow: [
          "/admin/", "/api/", "/auth/", "/account/", "/profile/",
          "/cart", "/checkout", "/_next/", "/catalog?*q=",
        ],
      },
      { userAgent: "GPTBot", disallow: ["/"] },
      { userAgent: "ChatGPT-User", disallow: ["/"] },
      { userAgent: "CCBot", disallow: ["/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}