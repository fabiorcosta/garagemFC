/**
 * Data de retirada por item ("disponível a partir de"). Só a data importa: guardamos ao meio-dia
 * de Brasília para que nenhum fuso desloque o dia na exibição.
 */
const TZ = "America/Sao_Paulo"

/** "AAAA-MM-DD" → Date (meio-dia em Brasília). null se o texto não for uma data real do calendário. */
export function parsePickupDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T12:00:00-03:00`)
  if (Number.isNaN(d.getTime())) return null
  // Rejeita datas "roladas" pelo JS (ex.: 2026-02-31 viraria 03/03)
  return toDateInput(d) === value ? d : null
}

/** Date → "AAAA-MM-DD" no fuso de Brasília (formato do <input type="date">). */
export function toDateInput(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d)
}

export function todayInput() {
  return toDateInput(new Date())
}

/** Texto para o comprador; null quando a retirada já é imediata (sem data ou data passada). */
export function pickupLabel(d: Date | string | null | undefined, style: "short" | "long" = "long") {
  if (!d) return null
  const date = typeof d === "string" ? new Date(d) : d
  if (toDateInput(date) <= todayInput()) return null
  return style === "short"
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(date)
    : new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long" }).format(date)
}
