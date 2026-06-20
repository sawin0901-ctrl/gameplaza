/** @type {import("next").NextConfig} */
const nextConfig = {
  // Убираем заголовок X-Powered-By (best practices)
  poweredByHeader: false,

  // Сжатие gzip/brotli
  compress: true,

  images: {
    // WebP/AVIF-конвертация для всех внешних изображений
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "digiseller.ru" },
      { protocol: "https", hostname: "cdn.digiseller.ru" },
      { protocol: "https", hostname: "graph.digiseller.ru" },
      { protocol: "https", hostname: "plati.market" },
      { protocol: "https", hostname: "www.plati.market" },
    ],
    // Кэширование оптимизированных изображений на 30 дней
    minimumCacheTTL: 2592000,
    // Ограничение числа одновременных оптимизаций
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.digiseller.ru https://digiseller.com http://digiseller.com https://shop.digiseller.com https://api.digiseller.com",
      "style-src 'self' 'unsafe-inline' https://shop.digiseller.com http://shop.digiseller.com https://api.digiseller.com",
      "img-src 'self' data: blob: https://digiseller.ru https://cdn.digiseller.ru https://graph.digiseller.ru https://plati.market https://www.plati.market https://shop.digiseller.com https://digiseller.com https://api.digiseller.com",
      "connect-src 'self' https://digiseller.com https://shop.digiseller.com https://api.digiseller.com https://o0.ingest.sentry.io",
      "font-src 'self' data: https://shop.digiseller.com https://api.digiseller.com https://digiseller.com",
      "frame-src https://digiseller.ru https://www.digiseller.ru https://digiseller.com https://shop.digiseller.com https://api.digiseller.com",
      "object-src 'none'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // Долгосрочное кэширование статических ассетов
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Кэш изображений
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ]
  },
}

let config = nextConfig
try {
  const { withSentryConfig } = require("@sentry/nextjs")
  config = withSentryConfig(nextConfig, {
    silent: true,
    disableLogger: true,
    sourcemaps: { disable: true },
  })
} catch {}

module.exports = config
