"use client"

import { useRef, useState } from "react"
import imageCompression from "browser-image-compression"
import { AlertCircle, ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { adminFetch } from "@/lib/admin-fetch"

export type UploadedPhoto = {
  /** id do ItemPhoto já salvo (ausente em fotos novas) */
  id?: string
  localId: string
  cloud_storage_path?: string
  thumbnailPath?: string | null
  preview: string
  state: "compressing" | "uploading" | "done" | "error"
  progress: number
  error?: string
}

// useWebWorker: false — com true a biblioteca baixa o próprio código de cdn.jsdelivr.net em tempo de execução
// (risco de cadeia de suprimentos e bloqueado pela CSP). Roda na thread principal, sem código externo.
const FULL_OPTS = { maxWidthOrHeight: 1600, initialQuality: 0.8, maxSizeMB: 0.4, fileType: "image/jpeg", useWebWorker: false }
const THUMB_OPTS = { maxWidthOrHeight: 400, initialQuality: 0.7, maxSizeMB: 0.03, fileType: "image/jpeg", useWebWorker: false }

function putWithProgress(url: string, blob: Blob, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", blob.type)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status})`)))
    xhr.onerror = () => reject(new Error("Falha de conexão no envio"))
    xhr.send(blob)
  })
}

export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: UploadedPhoto[]
  onChange: (update: (prev: UploadedPhoto[]) => UploadedPhoto[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const patch = (localId: string, p: Partial<UploadedPhoto>) =>
    onChange((prev) => prev.map((ph) => (ph.localId === localId ? { ...ph, ...p } : ph)))

  async function processFile(file: File) {
    const localId = crypto.randomUUID()
    onChange((prev) => [
      ...prev,
      { localId, preview: URL.createObjectURL(file), state: "compressing", progress: 0 },
    ])
    try {
      const [full, thumb] = await Promise.all([
        imageCompression(file, FULL_OPTS),
        imageCompression(file, THUMB_OPTS),
      ])
      patch(localId, { state: "uploading", preview: URL.createObjectURL(thumb) })
      const urls = await adminFetch<{ full: { key: string; uploadUrl: string }; thumb: { key: string; uploadUrl: string } }>(
        "/api/admin/upload",
        "POST",
        { contentType: full.type, fullSize: full.size, thumbSize: thumb.size },
      )
      const total = full.size + thumb.size
      let doneFull = 0
      let doneThumb = 0
      const report = () => patch(localId, { progress: (doneFull * full.size + doneThumb * thumb.size) / total })
      await Promise.all([
        putWithProgress(urls.full.uploadUrl, full, (p) => ((doneFull = p), report())),
        putWithProgress(urls.thumb.uploadUrl, thumb, (p) => ((doneThumb = p), report())),
      ])
      patch(localId, {
        state: "done",
        progress: 1,
        cloud_storage_path: urls.full.key,
        thumbnailPath: urls.thumb.key,
      })
    } catch (e) {
      patch(localId, { state: "error", error: (e as Error).message })
    }
  }

  function addFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"))
    images.forEach(processFile)
  }

  function move(index: number, to: number) {
    onChange((prev) => {
      const next = [...prev]
      const [p] = next.splice(index, 1)
      next.splice(Math.max(0, Math.min(next.length, to)), 0, p)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
          dragging ? "border-primary bg-terracotta-soft" : "hover:border-primary/60 hover:bg-muted/50",
        )}
      >
        <ImagePlus className="size-8 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Toque para escolher fotos ou arraste aqui</p>
        <p className="text-xs text-muted-foreground">As fotos são comprimidas no seu aparelho antes de enviar.</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.localId} className="relative overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && p.state === "done" && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  <Star className="size-3 fill-current" /> Principal
                </span>
              )}
              {(p.state === "compressing" || p.state === "uploading") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-xs font-medium text-white">
                  <Loader2 className="size-5 animate-spin" />
                  {p.state === "compressing" ? "Comprimindo…" : `Enviando ${Math.round(p.progress * 100)}%`}
                  <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white transition-all" style={{ width: `${p.progress * 100}%` }} />
                  </div>
                </div>
              )}
              {p.state === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 p-2 text-center text-[11px] text-white">
                  <AlertCircle className="size-5" />
                  {p.error ?? "Erro no envio"}
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((x) => x.localId !== p.localId))}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remover foto"
              >
                <X className="size-3.5" />
              </button>
              {p.state === "done" && photos.length > 1 && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <IconBtn label="Mover para a esquerda" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowLeft className="size-3.5" />
                  </IconBtn>
                  {i !== 0 && (
                    <IconBtn label="Tornar principal" onClick={() => move(i, 0)}>
                      <Star className="size-3.5" />
                    </IconBtn>
                  )}
                  <IconBtn label="Mover para a direita" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)}>
                    <ArrowRight className="size-3.5" />
                  </IconBtn>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-white/90 p-1.5 shadow disabled:invisible"
    >
      {children}
    </button>
  )
}
