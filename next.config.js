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
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
