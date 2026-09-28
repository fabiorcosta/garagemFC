import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute, badRequest, notFound, revalidatePublic } from "@/lib/api"
import { itemSchema, statusOnlySchema, syncPhotos, uniqueSlug } from "@/lib/item-service"
import { deleteFile } from "@/lib/s3"

type Ctx = RouteContext<"/api/admin/items/[id]">

export const GET = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const item = await db.item.findUnique({
    where: { id },
    include: { category: true, photos: { orderBy: { sortOrder: "asc" } } },
  })
  return item ? NextResponse.json(item) : notFound()
})

/** Atualização completa (formulário) ou só o status (ação rápida da tabela). */
export const PUT = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const existing = await db.item.findUnique({ where: { id }, select: { id: true, title: true, slug: true } })
  if (!existing) return notFound()
  const body = await req.json().catch(() => null)

  const statusOnly = statusOnlySchema.strict().safeParse(body)
  if (statusOnly.success) {
    const item = await db.item.update({ where: { id }, data: { status: statusOnly.data.status } })
    revalidatePublic()
    return NextResponse.json(item)
  }

  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { photos, ...data } = parsed.data
  // O slug só muda se o título mudar, para não quebrar links já compartilhados à toa.
  const slug = data.title === existing.title ? existing.slug : await uniqueSlug(data.title, id)

  const item = await db.item.update({
    where: { id },
    data: { ...data, originalPrice: data.originalPrice || null, slug },
  })
  await syncPhotos(id, photos)
  revalidatePublic()
  return NextResponse.json(item)
})

export const DELETE = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const photos = await db.itemPhoto.findMany({ where: { itemId: id } })
  const deleted = await db.item.deleteMany({ where: { id } })
  if (deleted.count === 0) return notFound()
  await Promise.allSettled(photos.flatMap((p) => [deleteFile(p.cloud_storage_path), deleteFile(p.thumbnailPath)]))
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
