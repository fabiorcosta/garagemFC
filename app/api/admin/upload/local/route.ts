import { writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { useLocalStorage } from "@/lib/aws-config"
import { adminRoute, badRequest, notFound } from "@/lib/api"
import { isValidKey, LOCAL_UPLOAD_DIR } from "@/lib/s3"

const MAX_BYTES = 1024 * 1024

/** Recebe o PUT da foto quando não há bucket configurado (desenvolvimento). */
export const PUT = adminRoute(async (req: Request) => {
  if (!useLocalStorage) return notFound()
  const key = new URL(req.url).searchParams.get("key") ?? ""
  if (!isValidKey(key)) return badRequest("Chave inválida")
  const data = Buffer.from(await req.arrayBuffer())
  if (data.length > MAX_BYTES) return badRequest("Arquivo muito grande")
  await writeFile(path.join(LOCAL_UPLOAD_DIR, key), data)
  return NextResponse.json({ ok: true })
})
