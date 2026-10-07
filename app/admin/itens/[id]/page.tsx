import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { adminPageContext } from "@/lib/admin-auth"
import { getSettings } from "@/lib/queries"
import { photoThumbUrl } from "@/lib/file-url"
import { toDateInput } from "@/lib/pickup-date"
import { ItemForm } from "../item-form"

export default async function EditItemPage(props: PageProps<"/admin/itens/[id]">) {
  const { db } = await adminPageContext()
  const { id } = await props.params
  const [item, categories] = await Promise.all([
    db.item.findUnique({ where: { id }, include: { photos: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ])
  if (!item) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Editar item</h1>
        {item.published ? (
          <Link href={`/itens/${item.slug}`} target="_blank" className="flex items-center gap-1 text-sm font-medium text-primary">
            Ver no site <ExternalLink className="size-4" />
          </Link>
        ) : (
          <span className="rounded-full bg-amber px-3 py-1 text-xs font-bold text-[#3D2A06] uppercase">Rascunho</span>
        )}
      </div>
      <ItemForm
        conditions={(await getSettings()).t.conditions.split("\n").map((c) => c.trim()).filter(Boolean)}
        categories={categories}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice ?? "",
          referenceUrl: item.referenceUrl ?? "",
          dimensions: item.dimensions ?? "",
          pickupFrom: item.pickupFrom ? toDateInput(item.pickupFrom) : "",
          published: item.published,
          condition: item.condition,
          status: item.status,
          acceptsOffers: item.acceptsOffers,
          featured: item.featured,
          categoryId: item.categoryId ?? "",
          photos: item.photos.map((p) => ({
            id: p.id,
            cloud_storage_path: p.cloud_storage_path,
            thumbnailPath: p.thumbnailPath,
            preview: photoThumbUrl(p) ?? "",
          })),
        }}
      />
    </div>
  )
}
