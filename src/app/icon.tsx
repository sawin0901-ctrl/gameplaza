import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32, borderRadius: 8,
        background: "linear-gradient(135deg, #7c6cf8 0%, #5b50cc 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: 900, fontSize: 20, color: "white",
        letterSpacing: "-1px",
      }}
    >
      GP
    </div>,
    { ...size }
  )
}