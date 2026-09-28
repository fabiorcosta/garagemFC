import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute, badRequest, revalidatePublic } from "@/lib/api"
import { slugify } from "@/lib/format"
import { categorySchema } from "@/lib/item-service"

export const GET = adminRoute(async () => {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  })
  return NextResponse.json(categories)
})

export const POST = adminRoute(async (req: Request) => {
  const parsed = categorySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const slug = slugify(parsed.data.name)
  if (!slug) return badRequest("Nome inválido")
  if (await db.category.findUnique({ where: { slug } })) return badRequest("Já existe uma categoria com esse nome")
  const category = await db.category.create({ data: { ...parsed.data, slug } })
  revalidatePublic()
  return NextResponse.json(category, { status: 201 })
})
