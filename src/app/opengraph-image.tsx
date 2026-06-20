import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "GamePlaza — Цифровые товары по лучшим ценам"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: -100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 500,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        {/* Bottom glow */}
        <div style={{
          position: "absolute",
          bottom: -80,
          right: 100,
          width: 400,
          height: 300,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 40,
        }}>
          <div style={{
            width: 80,
            height: 80,
            background: "#7c3aed",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 900,
            color: "#fff",
          }}>
            G
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#a78bfa", fontSize: 56, fontWeight: 800 }}>Game</span>
            <span style={{ color: "#fff", fontSize: 56, fontWeight: 800 }}>Plaza</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          color: "#fff",
          fontSize: 38,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          marginBottom: 20,
          maxWidth: 800,
        }}>
          Цифровые товары по лучшим ценам
        </div>

        <div style={{
          color: "#9ca3af",
          fontSize: 22,
          textAlign: "center",
        }}>
          Игры · Программы · Ключи активации · Подписки
        </div>

        {/* Bottom badge */}
        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 50,
          padding: "10px 24px",
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#10b981",
          }} />
          <span style={{ color: "#a78bfa", fontSize: 18, fontWeight: 500 }}>
            Мгновенная доставка · Официальный Digiseller
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
