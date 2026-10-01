import { NextResponse } from "next/server"
import { adminRoute, badRequest, notFound, parseId, readJson, revalidatePublic } from "@/lib/api"
import {
  assertCategory,
  deletePhotoFiles,
  itemPublicFields,
  itemSchema,
  quickUpdateSchema,
  syncPhotos,
  uniqueSlug,
  ValidationError,
} from "@/lib/item-service"

export const GET = adminRoute<{ id: string }>(async (_req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const item = await db.item.findUnique({
    where: { id },
    select: {
      ...itemPublicFields,
      description: true,
      price: true,
      originalPrice: true,
      referenceUrl: true,
      condition: true,
      dimensions: true,
      published: true,
      acceptsOffers: true,
      featured: true,
      categoryId: true,
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true, cloud_storage_path: true, thumbnailPath: true } },
    },
  })
  return item ? NextResponse.json(item) : notFound()
})

/** Atualização completa (formulário) ou só o status (ação rápida da tabela). */
export const PUT = adminRoute<{ id: string }>(async (req, { params }, { db, transaction }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const body = await readJson(req)

  const quick = quickUpdateSchema.safeParse(body)
  if (quick.success) {
    const updated = await db.item.updateMany({ where: { id }, data: quick.data })
    if (updated.count === 0) return notFound()
    revalidatePublic()
    return NextResponse.json({ ok: true })
  }

  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { photos, ...data } = parsed.data

  try {
    const result = await transaction(async (tx) => {
      const existing = await tx.item.findUnique({ where: { id }, select: { title: true, slug: true } })
      if (!existing) return null
      await assertCategory(tx, data.categoryId)
      // O slug só muda se o título mudar, para não quebrar links já compartilhados à toa.
      const slug = data.title === existing.title ? existing.slug : await uniqueSlug(tx, data.title, id)
      const item = await tx.item.update({
        where: { id },
        data: { ...data, originalPrice: data.originalPrice || null, referenceUrl: data.referenceUrl || null, dimensions: data.dimensions || null, slug },
        select: itemPublicFields,
      })
      const removed = await syncPhotos(tx, id, photos)
      return { item, removed }
    })
    if (!result) return notFound()
    await deletePhotoFiles(result.removed)
    revalidatePublic()
    return NextResponse.json(result.item)
  } catch (e) {
    if (e instanceof ValidationError) return badRequest(e.message)
    throw e
  }
})

export const DELETE = adminRoute<{ id: string }>(async (_req, { params }, { transaction }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const photos = await transaction(async (tx) => {
    const files = await tx.itemPhoto.findMany({ where: { itemId: id }, select: { cloud_storage_path: true, thumbnailPath: true } })
    const deleted = await tx.item.deleteMany({ where: { id } })
    return deleted.count === 0 ? null : files
  })
  if (!photos) return notFound()
  await deletePhotoFiles(photos)
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
