import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest, notFound, parseId, readJson } from "@/lib/api"
import { parsePickupDate } from "@/lib/pickup-date"
import { PAYMENT_METHODS } from "@/lib/sale-shared"

/**
 * Registro PRIVADO da venda (comprador, pagamento). Só admin (adminRoute) e só pelo papel garagem_admin:
 * a tabela Sale não tem nenhum GRANT para o visitante. Nunca é lida por páginas públicas.
 */
const saleSchema = z.strictObject({
  buyerName: z.string().trim().max(80, "Nome do comprador: no máximo 80 caracteres").default(""),
  soldBy: z.string().trim().max(60, "Vendido por: no máximo 60 caracteres").default(""),
  finalPrice: z.number().min(0, "Valor inválido").max(1_000_000, "Valor alto demais").nullable().default(null),
  paidPercent: z.number().int("Percentual inválido").min(0, "Percentual inválido").max(100, "Percentual inválido"),
  paymentMethod: z.union([z.enum(PAYMENT_METHODS), z.literal("")]).default(""),
  soldAt: z
    .string()
    .trim()
    .refine((v) => v === "" || parsePickupDate(v) !== null, "Data da venda inválida")
    .default(""),
  notes: z.string().trim().max(500, "Observações: no máximo 500 caracteres").default(""),
})

export const PUT = adminRoute<{ id: string }>(async (req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const parsed = saleSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const d = parsed.data

  const item = await db.item.findUnique({ where: { id }, select: { id: true } })
  if (!item) return notFound()

  const data = {
    buyerName: d.buyerName || null,
    soldBy: d.soldBy || null,
    finalPrice: d.finalPrice,
    paidPercent: d.paidPercent,
    paymentMethod: d.paymentMethod || null,
    soldAt: d.soldAt ? parsePickupDate(d.soldAt) : null,
    notes: d.notes || null,
  }
  await db.sale.upsert({ where: { itemId: id }, create: { itemId: id, ...data }, update: data, select: { id: true } })
  return NextResponse.json({ ok: true })
})

export const DELETE = adminRoute<{ id: string }>(async (_req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  await db.sale.deleteMany({ where: { itemId: id } })
  return NextResponse.json({ ok: true })
})
