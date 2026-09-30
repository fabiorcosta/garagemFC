import { NextResponse } from "next/server"
import { adminRoute, badRequest, readJson, revalidatePublic } from "@/lib/api"
import { assertCategory, itemPublicFields, itemSchema, syncPhotos, uniqueSlug, ValidationError } from "@/lib/item-service"

export const GET = adminRoute(async (_req, _ctx, { db }) => {
  const items = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    select: { ...itemPublicFields, price: true, featured: true, categoryId: true, createdAt: true },
  })
  return NextResponse.json(items)
})

export const POST = adminRoute(async (req, _ctx, { transaction }) => {
  const parsed = itemSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { photos, ...data } = parsed.data

  try {
    const item = await transaction(async (tx) => {
      await assertCategory(tx, data.categoryId)
      const created = await tx.item.create({
        data: { ...data, originalPrice: data.originalPrice || null, slug: await uniqueSlug(tx, data.title) },
        select: itemPublicFields,
      })
      await syncPhotos(tx, created.id, photos)
      return created
    })
    revalidatePublic()
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    if (e instanceof ValidationError) return badRequest(e.message)
    throw e
  }
})
