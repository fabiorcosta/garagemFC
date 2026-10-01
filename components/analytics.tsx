"use client"

import { useEffect } from "react"
import { CONSENT_EVENT, getConsent } from "@/lib/consent"
import { ensureGtag, GA_ENABLED, GA_ID } from "@/lib/gtag"

/**
 * GA4 só depois do "Aceitar" (modo de consentimento básico: sem aceite, nada é baixado nem enviado).
 * Sem script inline: a fila do gtag é montada em lib/gtag.ts e o script do Google entra com o nonce da CSP.
 * Ao recusar depois de ter aceitado: desliga o envio e apaga os cookies do GA.
 */
export function Analytics({ nonce }: { nonce?: string }) {
  useEffect(() => {
    if (!GA_ENABLED) return
    const disableKey = `ga-disable-${GA_ID}`

    function load() {
      ;(window as unknown as Record<string, unknown>)[disableKey] = false
      if (!ensureGtag() || document.getElementById("ga4-src")) return
      const s = document.createElement("script")
      s.id = "ga4-src"
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
      if (nonce) s.nonce = nonce
      document.head.appendChild(s)
    }

    function revoke() {
      ;(window as unknown as Record<string, unknown>)[disableKey] = true
      const host = location.hostname
      const domains = [host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`]
      for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
        if (!/^_ga(_|$)/.test(name)) continue
        for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=${d}`
        document.cookie = `${name}=; Max-Age=0; path=/`
      }
    }

    const apply = () => (getConsent() === "granted" ? load() : revoke())
    apply()
    window.addEventListener(CONSENT_EVENT, apply)
    return () => window.removeEventListener(CONSENT_EVENT, apply)
  }, [nonce])

  return null
}
