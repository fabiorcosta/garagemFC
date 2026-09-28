import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute, badRequest, revalidatePublic } from "@/lib/api"
import { itemSchema, syncPhotos, uniqueSlug } from "@/lib/item-service"

export const GET = adminRoute(async () => {
  const items = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  })
  return NextResponse.json(items)
})

export const POST = adminRoute(async (req: Request) => {
  const parsed = itemSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { photos, ...data } = parsed.data

  const item = await db.item.create({
    data: { ...data, originalPrice: data.originalPrice || null, slug: await uniqueSlug(data.title) },
  })
  await syncPhotos(item.id, photos)
  revalidatePublic()
  return NextResponse.json(item, { status: 201 })
})
