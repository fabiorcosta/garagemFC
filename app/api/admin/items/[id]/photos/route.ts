import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { adminRoute } from "@/lib/api"

export const GET = adminRoute(async (_req: Request, ctx: RouteContext<"/api/admin/items/[id]/photos">) => {
  const { id } = await ctx.params
  const photos = await db.itemPhoto.findMany({ where: { itemId: id }, orderBy: { sortOrder: "asc" } })
  return NextResponse.json(photos)
})
