"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CONSENT_EVENT, getConsent, setConsent } from "@/lib/consent"
import { GA_ENABLED } from "@/lib/gtag"

export type CookieTexts = { text: string; accept: string; reject: string; more: string }

/** Aviso de cookies: aparece enquanto não houver escolha. As duas opções têm o mesmo destaque (LGPD). */
export function CookieBanner({ texts }: { texts: CookieTexts }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!GA_ENABLED) return
    const sync = () => setOpen(getConsent() === null)
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border bg-card p-4 shadow-xl sm:bottom-5"
    >
      <div className="flex gap-3">
        <Cookie className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed">
          {texts.text}{" "}
          <Link href="/privacidade" className="font-medium text-primary underline underline-offset-2">
            {texts.more}
          </Link>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-10 rounded-full" onClick={() => setConsent("denied")}>
          {texts.reject}
        </Button>
        <Button className="h-10 rounded-full" onClick={() => setConsent("granted")}>
          {texts.accept}
        </Button>
      </div>
    </div>
  )
}

/** Botão da página de privacidade: apaga a escolha e reabre o aviso. */
export function ChangeCookieChoice({ label }: { label: string }) {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    const sync = () => {
      const c = getConsent()
      setCurrent(c === "granted" ? "aceitos" : c === "denied" ? "recusados" : "sem escolha")
    }
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])
  if (!GA_ENABLED) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" className="h-10 rounded-full" onClick={() => setConsent(null)}>
        {label}
      </Button>
      {current && <span className="text-sm text-muted-foreground">Cookies de estatística: {current}</span>}
    </div>
  )
}
