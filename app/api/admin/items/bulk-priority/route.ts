import { NextResponse } from "next/server"
import { z } from "zod"
import { AD_PRIORITIES } from "@/lib/ad-priority"
import { adminRoute, badRequest, idSchema, readJson } from "@/lib/api"

/** Mesma prioridade de anúncio para vários itens. Não muda nada no site público. */
const schema = z.strictObject({
  ids: z.array(idSchema).min(1, "Nenhum item selecionado").max(1000, "No máximo 1000 itens por vez"),
  adPriority: z.enum(AD_PRIORITIES),
})

export const POST = adminRoute(async (req, _ctx, { db }) => {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { ids, adPriority } = parsed.data
  const updated = await db.item.updateMany({ where: { id: { in: [...new Set(ids)] } }, data: { adPriority } })
  return NextResponse.json({ updated: updated.count })
})
