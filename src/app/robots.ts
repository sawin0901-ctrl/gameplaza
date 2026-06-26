import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/", "/catalog", "/catalog/", "/product/",
          "/about", "/help", "/privacy", "/refund", "/reviews", "/terms",
          "/llms.txt",
        ],
        disallow: [
          "/admin/", "/api/", "/auth/", "/account/", "/profile/",
          "/cart", "/checkout", "/_next/", "/catalog?*q=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}