import { NextResponse } from "next/server"
import { adminRoute, badRequest, notFound, parseId, readJson, revalidatePublic } from "@/lib/api"
import { slugify } from "@/lib/format"
import { categorySchema } from "@/lib/item-service"

export const PUT = adminRoute<{ id: string }>(async (req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const parsed = categorySchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const slug = slugify(parsed.data.name)
  if (!slug) return badRequest("Nome inválido")
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } })
  if (clash && clash.id !== id) return badRequest("Já existe uma categoria com esse nome")
  const updated = await db.category.updateMany({ where: { id }, data: { ...parsed.data, slug } })
  if (updated.count === 0) return notFound()
  revalidatePublic()
  return NextResponse.json({ ok: true })
})

/** Itens da categoria excluída ficam sem categoria (não são apagados). */
export const DELETE = adminRoute<{ id: string }>(async (_req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const deleted = await db.category.deleteMany({ where: { id } })
  if (deleted.count === 0) return notFound()
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
