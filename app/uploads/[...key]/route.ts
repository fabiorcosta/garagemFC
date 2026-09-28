import { readFile } from "node:fs/promises"
import path from "node:path"
import { useLocalStorage } from "@/lib/aws-config"
import { isValidKey, LOCAL_UPLOAD_DIR } from "@/lib/s3"

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }

/** Serve as fotos salvas em disco quando não há bucket configurado (desenvolvimento). */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...key]">) {
  const key = (await ctx.params).key.join("/")
  if (!useLocalStorage || !isValidKey(key)) return new Response("Não encontrado", { status: 404 })
  try {
    const data = await readFile(path.join(LOCAL_UPLOAD_DIR, key))
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[key.split(".").pop()!] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response("Não encontrado", { status: 404 })
  }
}
