import { NextResponse } from "next/server"
import { adminRoute, notFound, parseId, revalidatePublic } from "@/lib/api"
import { deletePhotoFiles } from "@/lib/item-service"

export const DELETE = adminRoute<{ id: string }>(async (_req, { params }, { transaction }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const photo = await transaction(async (tx) => {
    const found = await tx.itemPhoto.findUnique({ where: { id }, select: { cloud_storage_path: true, thumbnailPath: true } })
    if (found) await tx.itemPhoto.delete({ where: { id } })
    return found
  })
  if (!photo) return notFound()
  await deletePhotoFiles([photo])
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
