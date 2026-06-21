import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GamePlaza — магазин цифровых товаров",
    short_name: "GamePlaza",
    description: "Купить цифровые товары: игры, ПО, ключи активации. Быстро, безопасно, выгодно.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#7c3aed",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  }
}