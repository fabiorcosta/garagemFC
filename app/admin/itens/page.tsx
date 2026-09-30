import Link from "next/link"
import { Plus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { adminPageContext } from "@/lib/admin-auth"
import { photoThumbUrl } from "@/lib/file-url"
import { ItemsTable } from "./items-table"

export default async function AdminItemsPage() {
  const { db } = await adminPageContext()
  const items = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } }, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  })
  const rows = items.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    price: i.price,
    status: i.status,
    category: i.category?.name ?? null,
    thumb: photoThumbUrl(i.photos[0]),
    featured: i.featured,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Itens</h1>
          <p className="text-sm text-muted-foreground">{items.length} cadastrados</p>
        </div>
        <Link href="/admin/itens/novo" className={cn(buttonVariants(), "h-10 rounded-full px-4")}>
          <Plus />
          Novo item
        </Link>
      </div>
      <ItemsTable rows={rows} />
    </div>
  )
}
