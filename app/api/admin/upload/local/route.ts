import { writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { useLocalStorage } from "@/lib/aws-config"
import { adminRoute, badRequest, notFound } from "@/lib/api"
import { isValidKey, LOCAL_UPLOAD_DIR, MAX_UPLOAD_BYTES } from "@/lib/s3"

const query = z.object({
  key: z.string().refine(isValidKey),
  size: z.coerce.number().int().min(1).max(MAX_UPLOAD_BYTES.full),
})

/** Recebe o PUT da foto quando não há bucket configurado (só desenvolvimento). Mesmas regras do bucket. */
export const PUT = adminRoute(async (req) => {
  if (!useLocalStorage) return notFound()
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return badRequest("Envio inválido")
  const type = req.headers.get("content-type")
  if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type)) return badRequest("Tipo inválido")
  const data = Buffer.from(await req.arrayBuffer())
  if (data.length !== parsed.data.size) return badRequest("Tamanho diferente do autorizado")
  await writeFile(path.join(LOCAL_UPLOAD_DIR, parsed.data.key), data, { flag: "wx" })
  return NextResponse.json({ ok: true })
})
