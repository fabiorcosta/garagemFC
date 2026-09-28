import "server-only"
import { z } from "zod"
import { db } from "./db"
import { slugify, STATUSES } from "./format"
import { deleteFile, isValidKey } from "./s3"

const photoSchema = z.object({
  id: z.string().optional(),
  cloud_storage_path: z.string().refine(isValidKey),
  thumbnailPath: z.string().refine(isValidKey).nullable().optional(),
})

export const itemSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(120),
  description: z.string().trim().max(5000).default(""),
  price: z.coerce.number({ message: "Preço inválido" }).min(0, "Preço inválido"),
  originalPrice: z.coerce.number().min(0).nullable().optional(),
  condition: z.string().trim().min(1).max(40).default("Bom estado"),
  status: z.enum(STATUSES).default("disponivel"),
  acceptsOffers: z.boolean().default(false),
  featured: z.boolean().default(false),
  categoryId: z.string().nullable().optional(),
  photos: z.array(photoSchema).max(20).default([]),
})

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(60),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
})

export const statusOnlySchema = z.object({ status: z.enum(STATUSES) })

export async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title) || "item"
  let slug = base
  for (let n = 2; ; n++) {
    const existing = await db.item.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || existing.id === ignoreId) return slug
    slug = `${base}-${n}`
  }
}

/** Deixa as fotos do item exatamente como a lista recebida (ordem = sortOrder; a primeira é a principal). */
export async function syncPhotos(itemId: string, photos: z.infer<typeof photoSchema>[]) {
  const current = await db.itemPhoto.findMany({ where: { itemId } })
  const keepIds = new Set(photos.map((p) => p.id).filter(Boolean))
  const removed = current.filter((p) => !keepIds.has(p.id))

  await db.$transaction([
    db.itemPhoto.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } }),
    ...photos.map((p, i) =>
      p.id && current.some((c) => c.id === p.id)
        ? db.itemPhoto.update({ where: { id: p.id }, data: { sortOrder: i } })
        : db.itemPhoto.create({
            data: {
              itemId,
              cloud_storage_path: p.cloud_storage_path,
              thumbnailPath: p.thumbnailPath ?? null,
              isPublic: true,
              sortOrder: i,
            },
          }),
    ),
  ])

  await Promise.allSettled(removed.flatMap((p) => [deleteFile(p.cloud_storage_path), deleteFile(p.thumbnailPath)]))
}
