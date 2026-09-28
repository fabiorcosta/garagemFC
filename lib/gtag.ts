type GtagEvent = "view_item" | "contact_whatsapp" | "contact_form" | "share_item" | "view_category"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function track(event: GtagEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return
  window.gtag("event", event, params)
}
