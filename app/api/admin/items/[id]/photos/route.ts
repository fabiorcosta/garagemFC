import { NextResponse } from "next/server"
import { adminRoute, notFound, parseId } from "@/lib/api"

export const GET = adminRoute<{ id: string }>(async (_req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const photos = await db.itemPhoto.findMany({
    where: { itemId: id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, cloud_storage_path: true, thumbnailPath: true, sortOrder: true },
  })
  return NextResponse.json(photos)
})
