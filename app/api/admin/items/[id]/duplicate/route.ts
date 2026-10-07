import { NextResponse } from "next/server"
import { adminRoute, notFound, parseId } from "@/lib/api"
import { itemPublicFields, uniqueSlug } from "@/lib/item-service"

/**
 * Duplica um item como RASCUNHO (invisível ao público) e SEM fotos:
 * duas fichas apontando para o mesmo arquivo fariam a exclusão de uma apagar a foto da outra.
 */
export const POST = adminRoute<{ id: string }>(async (_req, { params }, { transaction }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const copy = await transaction(async (tx) => {
    const src = await tx.item.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        price: true,
        originalPrice: true,
        referenceUrl: true,
        condition: true,
        dimensions: true,
        pickupFrom: true,
        acceptsOffers: true,
        categoryId: true,
      },
    })
    if (!src) return null
    const title = `${src.title} (cópia)`.slice(0, 120)
    return tx.item.create({
      data: { ...src, title, slug: await uniqueSlug(tx, title), status: "disponivel", featured: false, published: false },
      select: itemPublicFields,
    })
  })
  return copy ? NextResponse.json(copy, { status: 201 }) : notFound()
})
