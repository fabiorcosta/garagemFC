import type { Metadata, Viewport } from "next"
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        {children}
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
