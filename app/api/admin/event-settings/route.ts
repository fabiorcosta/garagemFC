import { NextResponse } from "next/server"
import { adminRoute, badRequest, readJson, revalidatePublic } from "@/lib/api"
import { eventSettingsSchema } from "@/lib/event-item-service"

/** Grava só os 5 campos do evento no registro "main" (os demais ajustes do site não são tocados). */
export const PUT = adminRoute(async (req, _ctx, { db }) => {
  const parsed = eventSettingsSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  await db.siteSettings.upsert({ where: { id: "main" }, update: parsed.data, create: { id: "main", ...parsed.data } })
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
