import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest, notFound, parseId, readJson } from "@/lib/api"

const schema = z.strictObject({ read: z.boolean() })

export const PATCH = adminRoute<{ id: string }>(async (req, { params }, { db }) => {
  const id = await parseId(params)
  if (!id) return notFound()
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest("Dados inválidos")
  const updated = await db.contactMessage.updateMany({ where: { id }, data: { read: parsed.data.read } })
  if (updated.count === 0) return notFound()
  return NextResponse.json({ ok: true })
})
