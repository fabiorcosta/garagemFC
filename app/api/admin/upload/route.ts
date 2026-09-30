import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest, readJson, tooMany } from "@/lib/api"
import { rateLimitHit } from "@/lib/db"
import { buildKey, createPresignedUpload, MAX_UPLOAD_BYTES } from "@/lib/s3"
import { rlKey } from "@/lib/security"

const schema = z.strictObject({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fullSize: z.number().int().min(1).max(MAX_UPLOAD_BYTES.full),
  thumbSize: z.number().int().min(1).max(MAX_UPLOAD_BYTES.thumb),
})

/** Gera duas URLs de envio (foto + miniatura) presas ao tipo e ao tamanho exato de cada arquivo. */
export const POST = adminRoute(async (req, _ctx, { session }) => {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest("Foto inválida ou grande demais (máx. 600 KB depois de comprimida)")
  // 200 fotos a cada 10 minutos por admin
  if (!(await rateLimitHit(rlKey("upload", session.user.id), 200, 600))) return tooMany()

  const { contentType, fullSize, thumbSize } = parsed.data
  const fullKey = buildKey(contentType, "full")
  const thumbKey = buildKey(contentType, "thumb")
  const [fullUrl, thumbUrl] = await Promise.all([
    createPresignedUpload(fullKey, contentType, fullSize),
    createPresignedUpload(thumbKey, contentType, thumbSize),
  ])
  return NextResponse.json({
    full: { key: fullKey, uploadUrl: fullUrl },
    thumb: { key: thumbKey, uploadUrl: thumbUrl },
  })
})
