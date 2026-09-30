import type { NextConfig } from "next"

function bucketPattern() {
  const url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL
  if (!url) return []
  const { protocol, hostname } = new URL(url)
  return [{ protocol: protocol.replace(":", "") as "https" | "http", hostname, pathname: "/items/**" }]
}

/** Cabeçalhos para todas as respostas (a CSP com nonce fica no proxy.ts, só nas páginas). */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // As fotos já chegam comprimidas do navegador (thumb ≤ 40KB, foto ≤ 400KB),
    // então servimos direto do bucket sem otimizador no servidor.
    unoptimized: true,
    // Só o domínio do nosso bucket (nada de curingas de provedores inteiros).
    remotePatterns: bucketPattern(),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Respostas do admin e da autenticação nunca ficam em cache (navegador ou intermediários)
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ]
  },
}

export default nextConfig
