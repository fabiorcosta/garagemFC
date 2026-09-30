import "server-only"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { idSchema } from "./api"
import type { AdminDb } from "./db"
import { slugify, STATUSES } from "./format"
import { deleteFile, isValidKey } from "./s3"

const price = z.coerce.number({ message: "Preço inválido" }).min(0, "Preço inválido").max(1_000_000, "Preço alto demais")

const photoSchema = z.strictObject({
  id: idSchema.optional(),
  cloud_storage_path: z.string().refine(isValidKey, "Foto inválida"),
  thumbnailPath: z.string().refine(isValidKey, "Foto inválida").nullable().optional(),
})

export const itemSchema = z.strictObject({
  title: z.string().trim().min(1, "Título é obrigatório").max(120),
  description: z.string().trim().max(5000).default(""),
  price,
  originalPrice: price.nullable().optional(),
  condition: z.string().trim().min(1).max(40).default("Bom estado"),
  status: z.enum(STATUSES).default("disponivel"),
  acceptsOffers: z.boolean().default(false),
  featured: z.boolean().default(false),
  categoryId: idSchema.nullable().optional(),
  photos: z.array(photoSchema).max(20).default([]),
})

export const categorySchema = z.strictObject({
  name: z.string().trim().min(1, "Nome é obrigatório").max(60),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
})

export const statusOnlySchema = z.strictObject({ status: z.enum(STATUSES) })

/** Campos que as rotas devolvem ao navegador (nada além disso). */
export const itemPublicFields = { id: true, slug: true, title: true, status: true } satisfies Prisma.ItemSelect

type Tx = Prisma.TransactionClient

export async function uniqueSlug(tx: Tx, title: string, ignoreId?: string) {
  const base = slugify(title) || "item"
  let slug = base
  for (let n = 2; n < 500; n++) {
    const existing = await tx.item.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || existing.id === ignoreId) return slug
    slug = `${base}-${n}`
  }
  throw new Error("Não foi possível gerar um endereço único para o item")
}

export class ValidationError extends Error {}

export async function assertCategory(db: AdminDb | Tx, categoryId: string | null | undefined) {
  if (!categoryId) return
  const found = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } })
  if (!found) throw new ValidationError("Categoria não encontrada")
}

/**
 * Deixa as fotos do item exatamente como a lista recebida (ordem = sortOrder; a primeira é a principal).
 * Roda dentro da transação do chamador. Devolve os arquivos a apagar do bucket DEPOIS do commit.
 */
export async function syncPhotos(tx: Tx, itemId: string, photos: z.infer<typeof photoSchema>[]) {
  const current = await tx.itemPhoto.findMany({
    where: { itemId },
    select: { id: true, cloud_storage_path: true, thumbnailPath: true },
  })
  const currentIds = new Set(current.map((p) => p.id))
  const incoming = photos.filter((p) => !p.id || !currentIds.has(p.id))

  // Uma foto nova não pode apontar para arquivo já usado por outro item (apagar um apagaria o outro).
  const newKeys = incoming.flatMap((p) => [p.cloud_storage_path, p.thumbnailPath].filter((k): k is string => !!k))
  if (new Set(newKeys).size !== newKeys.length) throw new ValidationError("Foto repetida")
  if (newKeys.length) {
    const clash = await tx.itemPhoto.count({
      where: { OR: [{ cloud_storage_path: { in: newKeys } }, { thumbnailPath: { in: newKeys } }] },
    })
    if (clash) throw new ValidationError("Foto já usada em outro item")
  }

  const keepIds = new Set(photos.map((p) => p.id).filter((id): id is string => !!id && currentIds.has(id)))
  const removed = current.filter((p) => !keepIds.has(p.id))
  await tx.itemPhoto.deleteMany({ where: { id: { in: removed.map((p) => p.id) }, itemId } })
  for (const [i, p] of photos.entries()) {
    if (p.id && keepIds.has(p.id)) {
      await tx.itemPhoto.update({ where: { id: p.id, itemId }, data: { sortOrder: i } })
    } else {
      await tx.itemPhoto.create({
        data: {
          itemId,
          cloud_storage_path: p.cloud_storage_path,
          thumbnailPath: p.thumbnailPath ?? null,
          isPublic: true,
          sortOrder: i,
        },
      })
    }
  }
  return removed
}

export async function deletePhotoFiles(photos: { cloud_storage_path: string | null; thumbnailPath: string | null }[]) {
  await Promise.allSettled(photos.flatMap((p) => [deleteFile(p.cloud_storage_path), deleteFile(p.thumbnailPath)]))
}
