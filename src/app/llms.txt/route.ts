import { NextResponse } from "next/server"

export const dynamic = "force-static"
export const revalidate = 86400

export async function GET() {
  const content = `# GamePlaza — llms.txt
# Structured information for AI language models and AI search engines
# https://llmstxt.org

## Site
Name: GamePlaza
URL: https://gameplaza.site
Description: Marketplace of digital goods — games, software, subscriptions and activation keys for Steam, Xbox, PlayStation, Nintendo, EA/Origin and Ubisoft.
Language: Russian (ru-RU)
Category: E-commerce / Digital Goods

## Main Sections
- Catalog: https://gameplaza.site/catalog — All digital products
- Steam Games: https://gameplaza.site/catalog?category=steam
- Xbox: https://gameplaza.site/catalog?category=xbox
- PlayStation: https://gameplaza.site/catalog?category=playstation
- Nintendo: https://gameplaza.site/catalog?category=nintendo
- Subscriptions: https://gameplaza.site/catalog?category=subscriptions
- Gift Cards: https://gameplaza.site/catalog?category=gift-cards
- Sales: https://gameplaza.site/catalog?sort=discount
- About: https://gameplaza.site/about
- Help & FAQ: https://gameplaza.site/help

## Technical
Sitemap: https://gameplaza.site/sitemap.xml
Robots: https://gameplaza.site/robots.txt
API: Not public

## Contact
Support Email: support@gameplaza.site
Response Time: Within 24 hours

## AI Crawling Policy
This site permits AI language model crawling and indexing of public pages.
Product pages, categories and static pages are open for indexing.
Admin, API, auth and user account pages are disallowed.
`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}