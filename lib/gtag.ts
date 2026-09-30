type GtagEvent = "view_item" | "contact_whatsapp" | "contact_form" | "share_item" | "view_category"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * Envia um evento ao GA4. Se o script do Google ainda não carregou, o evento vai para a fila
 * (dataLayer) e é enviado quando ele carregar — sem isso, eventos disparados logo na abertura
 * da página (ex.: view_item) se perdiam.
 */
export function track(event: GtagEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !GA_ID) return
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || []
    // O gtag exige o objeto `arguments` (não um array comum) na fila
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
  }
  window.gtag("event", event, params)
}
