import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gameplaza.site"
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog", "/product/", "/about", "/help", "/llms.txt"],
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