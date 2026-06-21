import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180, height: 180, borderRadius: 36,
        background: "linear-gradient(135deg, #7c6cf8 0%, #5b50cc 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: 900, fontSize: 88, color: "white",
        letterSpacing: "-4px",
      }}
    >
      GP
    </div>,
    { ...size }
  )
}