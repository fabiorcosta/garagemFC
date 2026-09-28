import type { NextConfig } from "next"

function bucketPattern() {
  const url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL
  if (!url) return []
  const { protocol, hostname } = new URL(url)
  return [{ protocol: protocol.replace(":", "") as "https" | "http", hostname, pathname: "/**" }]
}

const nextConfig: NextConfig = {
  images: {
    // As fotos já chegam comprimidas do navegador (thumb ≤ 40KB, foto ≤ 400KB),
    // então servimos direto do bucket sem passar pelo otimizador da Vercel.
    unoptimized: true,
    remotePatterns: [
      ...bucketPattern(),
      { protocol: "https", hostname: "*.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
    ],
  },
}

export default nextConfig
