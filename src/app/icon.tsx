import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32, borderRadius: 7,
        background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: 900, fontSize: 18, color: "white",
        letterSpacing: "-0.5px",
      }}
    >
      G
    </div>,
    { ...size }
  )
}