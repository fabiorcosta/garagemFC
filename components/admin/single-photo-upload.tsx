"use client"

import { useRef, useState } from "react"
import imageCompression from "browser-image-compression"
import { ImagePlus, Loader2, X } from "lucide-react"
import { adminFetch } from "@/lib/admin-fetch"

export type PhotoKeys = { photoPath: string | null; thumbPath: string | null; preview: string | null }

// Mesmas opções do envio dos itens do catálogo (sem web worker: a biblioteca baixaria código externo).
const FULL_OPTS = { maxWidthOrHeight: 1600, initialQuality: 0.8, maxSizeMB: 0.4, fileType: "image/jpeg", useWebWorker: false }
const THUMB_OPTS = { maxWidthOrHeight: 400, initialQuality: 0.7, maxSizeMB: 0.03, fileType: "image/jpeg", useWebWorker: false }

async function put(url: string, blob: Blob) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob })
  if (!res.ok) throw new Error(`Falha no envio (${res.status})`)
}

/** Uma foto por item: comprime no aparelho e envia direto ao bucket com URL assinada pelo servidor. */
export function SinglePhotoUpload({
  value,
  onChange,
  onBusy,
}: {
  value: PhotoKeys
  onChange: (v: PhotoKeys) => void
  onBusy: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<"idle" | "working" | "error">("idle")
  const [error, setError] = useState("")

  async function handle(file: File) {
    if (!file.type.startsWith("image/")) return
    setState("working")
    onBusy(true)
    try {
      const [full, thumb] = await Promise.all([imageCompression(file, FULL_OPTS), imageCompression(file, THUMB_OPTS)])
      const urls = await adminFetch<{ full: { key: string; uploadUrl: string }; thumb: { key: string; uploadUrl: string } }>(
        "/api/admin/upload",
        "POST",
        { contentType: full.type, fullSize: full.size, thumbSize: thumb.size },
      )
      await Promise.all([put(urls.full.uploadUrl, full), put(urls.thumb.uploadUrl, thumb)])
      onChange({ photoPath: urls.full.key, thumbPath: urls.thumb.key, preview: URL.createObjectURL(thumb) })
      setState("idle")
    } catch (e) {
      setError((e as Error).message)
      setState("error")
    } finally {
      onBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted hover:border-primary/60"
        aria-label={value.preview ? "Trocar foto" : "Escolher foto"}
      >
        {value.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local ou do bucket
          <img src={value.preview} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-primary" aria-hidden />
        )}
        {state === "working" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </span>
        )}
      </button>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>{value.preview ? "Toque na foto para trocar." : "Toque para escolher a foto."}</span>
        <span>Ela é comprimida no seu aparelho antes de enviar.</span>
        {state === "error" && <span className="font-medium text-destructive">{error}</span>}
        {value.preview && state !== "working" && (
          <button
            type="button"
            onClick={() => onChange({ photoPath: null, thumbPath: null, preview: null })}
            className="inline-flex w-fit items-center gap-1 font-medium text-destructive hover:underline"
          >
            <X className="size-3" aria-hidden /> Tirar foto
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handle(f)
          e.target.value = ""
        }}
      />
    </div>
  )
}
