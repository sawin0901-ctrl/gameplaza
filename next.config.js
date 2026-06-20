/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "digiseller.ru" },
      { protocol: "https", hostname: "cdn.digiseller.ru" },
      { protocol: "https", hostname: "graph.digiseller.ru" },
      { protocol: "https", hostname: "plati.market" },
      { protocol: "https", hostname: "www.plati.market" },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.digiseller.ru",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://digiseller.ru https://cdn.digiseller.ru https://graph.digiseller.ru https://plati.market https://www.plati.market",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-src https://digiseller.ru https://www.digiseller.ru",
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
        ],
      },
    ]
  },
}

let config = nextConfig
try {
  const { withSentryConfig } = require("@sentry/nextjs")
  config = withSentryConfig(nextConfig, { silent: true, disableLogger: true, hideSourceMaps: true })
} catch {}

module.exports = config
