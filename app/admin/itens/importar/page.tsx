import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { adminPageContext } from "@/lib/admin-auth"
import { getSettings } from "@/lib/queries"
import { toDateInput } from "@/lib/pickup-date"
import { catalogKey } from "@/lib/whatsapp-import"
import { ImportWizard } from "./import-wizard"

export default async function ImportPage() {
  const { db } = await adminPageContext()
  const [categories, settings, existing] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
    db.item.findMany({ select: { title: true, price: true, photos: { select: { sourceHash: true } } } }),
  ])
  // O que já está no catálogo, para a revisão desmarcar o que já foi importado:
  //  - fotos importadas com impressão digital (exato);
  //  - itens sem impressão digital (cadastro manual ou importados antes): por nome + preço.
  const knownHashes = existing.flatMap((i) => i.photos.map((p) => p.sourceHash).filter((h): h is string => !!h))
  const legacyKeys = existing.filter((i) => !i.photos.some((p) => p.sourceHash)).map((i) => catalogKey(i.title, i.price))
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/itens" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Itens
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">Importar do WhatsApp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada foto com legenda vira um item do catálogo. A legenda deve ter o nome, o número/tamanho e o preço, uma informação por
          linha. Você confere tudo antes de publicar.
        </p>
      </div>
      <ImportWizard
        categories={categories}
        conditions={settings.t.conditions.split("\n").map((c) => c.trim()).filter(Boolean)}
        maxPickup={settings.saleEndDate ? toDateInput(settings.saleEndDate) : ""}
        knownHashes={knownHashes}
        legacyKeys={legacyKeys}
      />
    </div>
  )
}
