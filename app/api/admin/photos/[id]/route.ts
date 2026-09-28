import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute, notFound, revalidatePublic } from "@/lib/api"
import { deleteFile } from "@/lib/s3"

export const DELETE = adminRoute(async (_req: Request, ctx: RouteContext<"/api/admin/photos/[id]">) => {
  const { id } = await ctx.params
  const photo = await db.itemPhoto.findUnique({ where: { id } })
  if (!photo) return notFound()
  await db.itemPhoto.delete({ where: { id } })
  await Promise.allSettled([deleteFile(photo.cloud_storage_path), deleteFile(photo.thumbnailPath)])
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
