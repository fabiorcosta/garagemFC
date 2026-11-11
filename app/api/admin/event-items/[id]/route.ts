import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { adminRoute, badRequest, notFound, parseId, readJson, revalidatePublic } from "@/lib/api"
import {
  assertGroupHasRoom,
  assertPhotoKeysFree,
  eventItemFields,
  eventItemSchema,
  eventQuickSchema,
} from "@/lib/event-item-service"
import { deletePhotoFiles, ValidationError } from "@/lib/item-service"

function handleError(e: unknown) {
  if (e instanceof ValidationError) return badRequest(e.message)
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
    return badRequest("Outra alteração aconteceu ao mesmo tempo. Tente de novo.")
  }
  throw e
}

/** Edição completa. O id vem só da URL (validado); o corpo nunca escolhe qual registro alterar. */
export const PUT = adminRoute<{ id: string }>(async (req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const parsed = eventItemSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const data = parsed.data
  try {
    const result = await db.$transaction(
      async (tx) => {
        const current = await tx.eventItem.findUnique({ where: { id }, select: { group: true, photoPath: true, thumbPath: true } })
        if (!current) return null
        if (current.group !== data.group) await assertGroupHasRoom(tx, data.group, id)
        // Só as chaves novas precisam estar livres; as que o item já tinha continuam dele.
        const newKeys = [data.photoPath, data.thumbPath].filter((k) => k && k !== current.photoPath && k !== current.thumbPath)
        await assertPhotoKeysFree(tx, newKeys, id)
        const item = await tx.eventItem.update({ where: { id }, data, select: eventItemFields })
        const kept = new Set([data.photoPath, data.thumbPath])
        const orphan = {
          cloud_storage_path: current.photoPath && !kept.has(current.photoPath) ? current.photoPath : null,
          thumbnailPath: current.thumbPath && !kept.has(current.thumbPath) ? current.thumbPath : null,
        }
        return { item, orphan }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    if (!result) return notFound()
    // Arquivo trocado só sai do bucket depois de gravado no banco.
    await deletePhotoFiles([result.orphan])
    revalidatePublic()
    return NextResponse.json(result.item)
  } catch (e) {
    return handleError(e)
  }
})

/** Ação rápida: marcar vendido / esconder. */
export const PATCH = adminRoute<{ id: string }>(async (req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const parsed = eventQuickSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const updated = await db.eventItem.updateMany({ where: { id }, data: parsed.data })
  if (updated.count === 0) return notFound()
  revalidatePublic()
  return NextResponse.json({ ok: true })
})

export const DELETE = adminRoute<{ id: string }>(async (_req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const removed = await db.$transaction(async (tx) => {
    const found = await tx.eventItem.findUnique({ where: { id }, select: { photoPath: true, thumbPath: true } })
    if (found) await tx.eventItem.delete({ where: { id } })
    return found
  })
  if (!removed) return notFound()
  await deletePhotoFiles([{ cloud_storage_path: removed.photoPath, thumbnailPath: removed.thumbPath }])
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
