/** Prioridade para anúncios pagos. Só o painel e a API protegida (/api/anuncios/itens) enxergam. */
export const AD_PRIORITIES = ["nao_anunciar", "normal", "alta", "maxima"] as const
export type AdPriority = (typeof AD_PRIORITIES)[number]

export const AD_PRIORITY_LABEL: Record<AdPriority, string> = {
  nao_anunciar: "Não anunciar",
  normal: "Normal",
  alta: "Alta",
  maxima: "Máxima",
}

export function isAdPriority(v: unknown): v is AdPriority {
  return typeof v === "string" && (AD_PRIORITIES as readonly string[]).includes(v)
}
