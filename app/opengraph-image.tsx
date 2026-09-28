import { ImageResponse } from "next/og"

export const alt = "Garagem do Fabio — venda de mudança"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#E4572E",
          color: "white",
        }}
      >
        <div style={{ fontSize: 44, opacity: 0.85 }}>Venda de mudança</div>
        <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1.05 }}>Garagem do Fabio</div>
        <div style={{ fontSize: 40, marginTop: 24, opacity: 0.9 }}>
          Móveis, eletrônicos e eletrodomésticos com preço de desapego
        </div>
      </div>
    ),
    size,
  )
}
