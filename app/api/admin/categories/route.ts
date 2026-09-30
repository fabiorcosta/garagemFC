import { NextResponse } from "next/server"
import { adminRoute, badRequest, readJson, revalidatePublic } from "@/lib/api"
import { slugify } from "@/lib/format"
import { categorySchema } from "@/lib/item-service"

const categoryFields = { id: true, name: true, slug: true, sortOrder: true } as const

export const GET = adminRoute(async (_req, _ctx, { db }) => {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { ...categoryFields, _count: { select: { items: true } } },
  })
  return NextResponse.json(categories)
})

export const POST = adminRoute(async (req, _ctx, { db }) => {
  const parsed = categorySchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const slug = slugify(parsed.data.name)
  if (!slug) return badRequest("Nome inválido")
  if (await db.category.findUnique({ where: { slug }, select: { id: true } })) {
    return badRequest("Já existe uma categoria com esse nome")
  }
  const category = await db.category.create({ data: { ...parsed.data, slug }, select: categoryFields })
  revalidatePublic()
  return NextResponse.json(category, { status: 201 })
})
