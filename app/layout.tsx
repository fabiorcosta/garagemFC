import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@/components/analytics"
import { siteUrl } from "@/lib/format"
import "./globals.css"

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Garagem do Fabio", template: "%s — Garagem do Fabio" },
  description: "Venda de móveis, eletrônicos e eletrodomésticos por mudança. Retirada no local.",
  openGraph: { siteName: "Garagem do Fabio", locale: "pt_BR", type: "website" },
}

export const viewport: Viewport = {
  themeColor: "#FBF6EE",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonce da CSP (gerado no proxy.ts a cada requisição)
  const nonce = (await headers()).get("x-nonce") ?? undefined
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        {children}
        <Toaster position="top-center" richColors />
        <Analytics nonce={nonce} />
      </body>
    </html>
  )
}
