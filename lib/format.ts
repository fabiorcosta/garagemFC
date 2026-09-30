export const STATUSES = ["disponivel", "reservado", "vendido"] as const
export type ItemStatus = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<ItemStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
}

export const PRICE_RANGES = [
  { value: "ate-200", label: "Até R$ 200", min: 0, max: 200 },
  { value: "200-500", label: "R$ 200 a 500", min: 200, max: 500 },
  { value: "500-1500", label: "R$ 500 a 1.500", min: 500, max: 1500 },
  { value: "acima-1500", label: "Acima de R$ 1.500", min: 1500, max: undefined },
] as const

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function formatPrice(value: number) {
  return brl.format(value)
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "")
}

export function whatsappLink(phone: string, text: string) {
  let digits = onlyDigits(phone)
  if (digits && digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function daysUntil(date: Date | null | undefined) {
  if (!date) return null
  const ms = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

/** Devolve o link só se for https:// válido (segunda barreira antes de exibir); senão null. */
export function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const u = new URL(value)
    if (u.protocol !== "https:" || u.username || u.password) return null
    return { href: u.href, host: u.hostname.replace(/^www\./, "") }
  } catch {
    return null
  }
}
