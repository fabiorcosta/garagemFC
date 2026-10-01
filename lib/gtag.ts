import { getConsent } from "./consent"

type GtagEvent = "view_item" | "contact_whatsapp" | "contact_form" | "share_item" | "view_category"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
/** O ID entra numa URL de script: só aceita o formato oficial do GA4. */
export const GA_ENABLED = !!GA_ID && /^G-[A-Z0-9]{4,20}$/.test(GA_ID)

/**
 * Prepara a fila do gtag (idempotente) — só com consentimento. Comandos ficam no dataLayer
 * até o script do Google carregar. Minimização: sem Google Signals e sem personalização de anúncios.
 */
export function ensureGtag() {
  if (typeof window === "undefined" || !GA_ENABLED || getConsent() !== "granted") return false
  if (window.gtag) return true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // O gtag exige o objeto `arguments` (não um array comum) na fila
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag("js", new Date())
  window.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false })
  return true
}

/** Envia um evento ao GA4 — só com consentimento; sem aceite o evento é descartado (não fica guardado). */
export function track(event: GtagEvent, params: Record<string, unknown> = {}) {
  if (!ensureGtag()) return
  window.gtag!("event", event, params)
}
