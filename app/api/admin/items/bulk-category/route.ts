import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest, idSchema, readJson, revalidatePublic } from "@/lib/api"
import { assertCategory, ValidationError } from "@/lib/item-service"

/** Mesma categoria para vários itens de uma vez. null = tirar a categoria. */
const schema = z.strictObject({
  ids: z.array(idSchema).min(1, "Nenhum item selecionado").max(1000, "No máximo 1000 itens por vez"),
  categoryId: idSchema.nullable(),
})

export const POST = adminRoute(async (req, _ctx, { db }) => {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { ids, categoryId } = parsed.data
  try {
    await assertCategory(db, categoryId)
  } catch (e) {
    if (e instanceof ValidationError) return badRequest(e.message)
    throw e
  }
  const updated = await db.item.updateMany({ where: { id: { in: [...new Set(ids)] } }, data: { categoryId } })
  revalidatePublic()
  return NextResponse.json({ updated: updated.count })
})
