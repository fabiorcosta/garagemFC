/** Constantes da venda usadas no formulário (cliente) e na validação (servidor). */
export const PAYMENT_METHODS = ["pix", "dinheiro", "transferencia", "cartao", "outro"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  cartao: "Cartão",
  outro: "Outro",
}

/** "Pago", "Não pago" ou "Pago 20%". */
export function paymentStatusLabel(percent: number) {
  if (percent >= 100) return "Pago"
  if (percent <= 0) return "Não pago"
  return `Pago ${percent}%`
}

export type SaleValues = {
  buyerName: string
  soldBy: string
  finalPrice: number | ""
  paidPercent: number
  paymentMethod: PaymentMethod | ""
  soldAt: string
  notes: string
}
