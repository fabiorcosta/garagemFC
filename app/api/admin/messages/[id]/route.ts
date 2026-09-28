import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { adminRoute, badRequest, notFound } from "@/lib/api"

const schema = z.object({ read: z.boolean().default(true) })

export const PATCH = adminRoute(async (req: Request, ctx: RouteContext<"/api/admin/messages/[id]">) => {
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return badRequest("Dados inválidos")
  const updated = await db.contactMessage.updateMany({ where: { id }, data: { read: parsed.data.read } })
  if (updated.count === 0) return notFound()
  return NextResponse.json({ ok: true })
})
