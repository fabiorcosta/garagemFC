import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { adminPageContext } from "@/lib/admin-auth"
import { getSettings } from "@/lib/queries"
import { toDateInput } from "@/lib/pickup-date"
import { ImportWizard } from "./import-wizard"

export default async function ImportPage() {
  const { db } = await adminPageContext()
  const [categories, settings] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ])
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
      />
    </div>
  )
}
