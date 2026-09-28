import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute, badRequest, notFound, revalidatePublic } from "@/lib/api"
import { slugify } from "@/lib/format"
import { categorySchema } from "@/lib/item-service"

type Ctx = RouteContext<"/api/admin/categories/[id]">

export const PUT = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const parsed = categorySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const slug = slugify(parsed.data.name)
  const clash = await db.category.findUnique({ where: { slug } })
  if (clash && clash.id !== id) return badRequest("Já existe uma categoria com esse nome")
  const updated = await db.category.updateMany({ where: { id }, data: { ...parsed.data, slug } })
  if (updated.count === 0) return notFound()
  revalidatePublic()
  return NextResponse.json({ ok: true })
})

/** Itens da categoria excluída ficam sem categoria (não são apagados). */
export const DELETE = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const deleted = await db.category.deleteMany({ where: { id } })
  if (deleted.count === 0) return notFound()
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
