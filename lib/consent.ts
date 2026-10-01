/**
 * Consentimento de cookies (LGPD). Guarda só a escolha e a data — nada que identifique a pessoa.
 * Sem escolha registrada = sem Google Analytics (nem script carregado, nem eventos na fila).
 */
export type Consent = "granted" | "denied"

const KEY = "garagem-consent-v1"
export const CONSENT_EVENT = "garagem-consent-change"

export function getConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { v?: unknown }
    return parsed.v === "granted" || parsed.v === "denied" ? parsed.v : null
  } catch {
    return null
  }
}

export function setConsent(v: Consent | null) {
  try {
    if (v) window.localStorage.setItem(KEY, JSON.stringify({ v, at: new Date().toISOString().slice(0, 10) }))
    else window.localStorage.removeItem(KEY)
  } catch {
    // armazenamento bloqueado: a escolha vale só para esta visita
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }))
}
