"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import imageCompression from "browser-image-compression"
import { AlertCircle, CheckCircle2, FileArchive, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { itemTitle, parseChat } from "@/lib/whatsapp-import"
import { listZip, readEntry, ZipError, type ZipEntry } from "@/lib/zip-reader"

/** Mesmas opções do cadastro manual (sem web worker: a biblioteca baixaria código externo). */
const FULL_OPTS = { maxWidthOrHeight: 1600, initialQuality: 0.8, maxSizeMB: 0.4, fileType: "image/jpeg", useWebWorker: false }
const THUMB_OPTS = { maxWidthOrHeight: 400, initialQuality: 0.7, maxSizeMB: 0.03, fileType: "image/jpeg", useWebWorker: false }
const MAX_ROWS = 500
const CHAT_MAX_BYTES = 5 * 1024 * 1024

type Row = {
  key: string
  blob: File
  preview: string
  title: string
  price: string
  condition: string
  description: string
  selected: boolean
  duplicateOf: number | null
  status: "idle" | "working" | "ok" | "error"
  error?: string
  slug?: string
}

type Status = { phase: "pick" | "reading" | "review"; progress?: string }

async function sha256(blob: Blob) {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("")
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Chamada às rotas /api/admin já existentes; se o limite de requisições estourar, espera e tenta de novo. */
async function api<T>(url: string, method: string, body: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (res.status === 429 && attempt < 6) {
      await sleep(30_000)
      continue
    }
    if (res.status === 401) {
      window.location.assign("/login")
      throw new Error("Sessão expirada")
    }
    if (!res.ok) throw new Error(data.error ?? "Algo deu errado")
    return data as T
  }
}

async function put(url: string, blob: Blob) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob })
  if (!res.ok) throw new Error(`Falha no envio da foto (${res.status})`)
}

export function ImportWizard({
  categories,
  conditions,
  maxPickup,
}: {
  categories: { id: string; name: string }[]
  conditions: string[]
  maxPickup: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ phase: "pick" })
  const [rows, setRows] = useState<Row[]>([])
  const [skipped, setSkipped] = useState(0)
  const [categoryId, setCategoryId] = useState("")
  const [pickupFrom, setPickupFrom] = useState("")
  const [published, setPublished] = useState(true)
  const [publishing, setPublishing] = useState(false)

  // Libera as prévias (blob:) ao sair da tela
  const previews = useRef<string[]>([])
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const usedCondition = conditions.find((c) => /bom/i.test(c)) ?? conditions[0] ?? "Bom estado"
  const newCondition = conditions.find((c) => /sem uso|novo|lacrad/i.test(c)) ?? usedCondition

  const patch = (key: string, p: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)))

  async function load(file: File) {
    setStatus({ phase: "reading", progress: "Abrindo o arquivo…" })
    try {
      const entries = await listZip(file)
      const byName = new Map<string, ZipEntry>()
      for (const e of entries) byName.set(e.name.split("/").pop() ?? e.name, e)
      const chatEntry = entries.find((e) => /(^|\/)_chat\.txt$/i.test(e.name)) ?? entries.find((e) => /\.txt$/i.test(e.name))
      if (!chatEntry) throw new ZipError("Não achei o texto da conversa no .zip. Exporte com a opção \"Anexar mídia\".")
      const text = await (await readEntry(file, chatEntry, CHAT_MAX_BYTES)).text()
      const parsed = parseChat(text).slice(0, MAX_ROWS)
      if (!parsed.length) throw new ZipError("Nenhuma foto com legenda encontrada nesta conversa.")

      const out: Row[] = []
      const seen = new Map<string, number>()
      let missing = 0
      for (const [i, p] of parsed.entries()) {
        setStatus({ phase: "reading", progress: `Lendo foto ${i + 1} de ${parsed.length}…` })
        const entry = byName.get(p.file)
        if (!entry) {
          missing++
          continue
        }
        const raw = await readEntry(file, entry)
        const blob = new File([raw], p.file, { type: /\.png$/i.test(p.file) ? "image/png" : /\.webp$/i.test(p.file) ? "image/webp" : "image/jpeg" })
        const hash = await sha256(blob)
        const duplicateOf = seen.get(hash) ?? null
        if (duplicateOf === null) seen.set(hash, out.length + 1)
        const preview = URL.createObjectURL(blob)
        previews.current.push(preview)
        out.push({
          key: `${i}-${p.file}`,
          blob,
          preview,
          title: itemTitle(p),
          price: p.price ? String(p.price) : "",
          condition: p.unused ? newCondition : usedCondition,
          description: p.description,
          // Repetida ou sem preço: começa desmarcada (você decide)
          selected: duplicateOf === null && !!p.price,
          duplicateOf,
          status: "idle",
        })
      }
      setSkipped(missing)
      setRows(out)
      setStatus({ phase: "review" })
    } catch (e) {
      toast.error(e instanceof ZipError ? e.message : "Não consegui ler esse arquivo. Confira se é o .zip exportado do WhatsApp.")
      setStatus({ phase: "pick" })
    }
  }

  async function publishOne(r: Row) {
    const price = Number(r.price)
    if (!r.title.trim()) throw new Error("Falta o nome")
    if (!Number.isFinite(price) || price <= 0) throw new Error("Falta o preço")
    const [full, thumb] = await Promise.all([imageCompression(r.blob, FULL_OPTS), imageCompression(r.blob, THUMB_OPTS)])
    const urls = await api<{ full: { key: string; uploadUrl: string }; thumb: { key: string; uploadUrl: string } }>("/api/admin/upload", "POST", {
      contentType: full.type,
      fullSize: full.size,
      thumbSize: thumb.size,
    })
    await Promise.all([put(urls.full.uploadUrl, full), put(urls.thumb.uploadUrl, thumb)])
    return api<{ slug: string }>("/api/admin/items", "POST", {
      title: r.title.trim(),
      description: r.description,
      price,
      condition: r.condition,
      categoryId: categoryId || null,
      pickupFrom,
      published,
      photos: [{ cloud_storage_path: urls.full.key, thumbnailPath: urls.thumb.key }],
    })
  }

  async function publishAll() {
    const queue = rows.filter((r) => r.selected && r.status !== "ok")
    if (!queue.length) return toast.error("Nenhum item selecionado")
    setPublishing(true)
    let ok = 0
    let fail = 0
    // Dois por vez: rápido sem sobrecarregar o celular nem o limite do servidor.
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        patch(r.key, { status: "working", error: undefined })
        try {
          const item = await publishOne(r)
          patch(r.key, { status: "ok", selected: false, slug: item.slug })
          ok++
        } catch (e) {
          patch(r.key, { status: "error", error: (e as Error).message })
          fail++
        }
      }
    }
    await Promise.all([worker(), worker()])
    setPublishing(false)
    if (fail) toast.error(`${ok} publicados, ${fail} com erro. Corrija e toque em publicar de novo.`)
    else toast.success(`${ok} itens publicados`)
  }

  const selectedCount = rows.filter((r) => r.selected && r.status !== "ok").length
  const doneCount = rows.filter((r) => r.status === "ok").length
  const dupCount = rows.filter((r) => r.duplicateOf !== null).length

  if (status.phase !== "review") {
    return (
      <div className="flex flex-col gap-4">
        <ol className="list-decimal space-y-1 rounded-2xl border bg-card p-4 pl-8 text-sm">
          <li>No WhatsApp, abra a conversa com as fotos.</li>
          <li>Toque no nome no topo → <strong>Exportar conversa</strong> → <strong>Anexar mídia</strong>.</li>
          <li>Salve o arquivo .zip e escolha-o aqui embaixo.</li>
        </ol>
        <button
          type="button"
          disabled={status.phase === "reading"}
          onClick={() => input.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center hover:border-primary/60 hover:bg-muted/50 disabled:opacity-70"
        >
          {status.phase === "reading" ? <Loader2 className="size-8 animate-spin text-primary" aria-hidden /> : <FileArchive className="size-8 text-primary" aria-hidden />}
          <span className="text-sm font-semibold">{status.progress ?? "Escolher o .zip da conversa"}</span>
          <span className="text-xs text-muted-foreground">O arquivo é lido no seu aparelho. Nada é publicado antes da sua revisão.</span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void load(f)
            e.target.value = ""
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="imp-cat">Categoria (para todos)</Label>
          <select id="imp-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link href="/admin/categorias" target="_blank" className="text-xs text-primary hover:underline">
            Criar categoria nova
          </Link>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="imp-pickup">Retirada a partir de (opcional)</Label>
          <Input id="imp-pickup" type="date" min="2026-01-01" max={maxPickup || undefined} value={pickupFrom} onChange={(e) => setPickupFrom(e.target.value)} className="h-10" />
          <span className="text-xs text-muted-foreground">Vazio = retirada imediata.</span>
        </div>
        <label className="flex items-center gap-2 self-center text-sm">
          <Switch checked={published} onCheckedChange={setPublished} /> Publicar já no site
        </label>
      </div>

      <p className="text-sm text-muted-foreground">
        {rows.length} fotos com legenda.
        {dupCount > 0 && ` ${dupCount} repetidas (desmarcadas).`}
        {skipped > 0 && ` ${skipped} sem a foto no .zip (ignoradas).`}
        {doneCount > 0 && ` ${doneCount} já publicadas.`}
      </p>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {rows.map((r, i) => (
          <li key={r.key} className={cn("flex gap-3 p-3", r.status === "ok" && "bg-olive-soft/40")}>
            <input
              type="checkbox"
              aria-label={`Importar ${r.title}`}
              checked={r.selected}
              disabled={r.status === "ok" || publishing}
              onChange={(e) => patch(r.key, { selected: e.target.checked })}
              className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
            <img src={r.preview} alt="" loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Input
                aria-label="Nome"
                value={r.title}
                maxLength={120}
                disabled={r.status === "ok" || publishing}
                onChange={(e) => patch(r.key, { title: e.target.value })}
                className="h-9"
              />
              <textarea
                aria-label="Descrição"
                value={r.description}
                maxLength={2000}
                rows={Math.min(4, Math.max(2, r.description.split("\n").length))}
                disabled={r.status === "ok" || publishing}
                onChange={(e) => patch(r.key, { description: e.target.value })}
                className="w-full resize-y rounded-md border bg-background px-3 py-1.5 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  R$
                  <Input
                    aria-label="Preço"
                    inputMode="numeric"
                    value={r.price}
                    disabled={r.status === "ok" || publishing}
                    onChange={(e) => patch(r.key, { price: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                    className="h-9 w-24"
                  />
                </div>
                <select
                  aria-label="Condição"
                  value={r.condition}
                  disabled={r.status === "ok" || publishing}
                  onChange={(e) => patch(r.key, { condition: e.target.value })}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {(conditions.includes(r.condition) ? conditions : [r.condition, ...conditions]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {r.duplicateOf !== null && (
                  <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold">Foto repetida (igual à nº {r.duplicateOf})</span>
                )}
                {!r.price && r.status !== "ok" && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">Sem preço</span>}
              </div>
              {r.status === "working" && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enviando…
                </span>
              )}
              {r.status === "ok" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-olive">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Publicado
                  {r.slug && (
                    <Link href={`/itens/${r.slug}`} target="_blank" className="font-normal underline">
                      ver
                    </Link>
                  )}
                </span>
              )}
              {r.status === "error" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden /> {r.error}
                </span>
              )}
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">{i + 1}</span>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-16 z-20 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg md:bottom-4">
        <Button onClick={publishAll} disabled={publishing || selectedCount === 0} className="h-11 rounded-full px-5">
          {publishing ? <Loader2 className="animate-spin" /> : <Upload />}
          {publishing ? "Publicando…" : `Publicar ${selectedCount} ${selectedCount === 1 ? "item" : "itens"}`}
        </Button>
        {!publishing && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => {
              setRows([])
              setStatus({ phase: "pick" })
            }}
          >
            Escolher outro arquivo
          </button>
        )}
        {doneCount > 0 && !publishing && (
          <Link href="/admin/itens" className="ml-auto text-sm font-semibold text-primary hover:underline">
            Ver itens no painel
          </Link>
        )}
      </div>
    </div>
  )
}
