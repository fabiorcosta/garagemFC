import Link from "next/link"
import { Plus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { adminPageContext } from "@/lib/admin-auth"
import { photoThumbUrl } from "@/lib/file-url"
import { pickupLabel, toDateInput } from "@/lib/pickup-date"
import type { SaleValues } from "@/lib/sale-shared"
import { ItemsTable } from "./items-table"

export default async function AdminItemsPage() {
  const { db } = await adminPageContext()
  const items = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { photos: true } },
      sale: {
        select: { buyerName: true, soldBy: true, finalPrice: true, paidPercent: true, paymentMethod: true, soldAt: true, notes: true },
      },
    },
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
    published: i.published,
    pickup: pickupLabel(i.pickupFrom, "short"),
    photoCount: i._count.photos,
    sale: i.sale
      ? {
          buyerName: i.sale.buyerName ?? "",
          soldBy: i.sale.soldBy ?? "",
          finalPrice: i.sale.finalPrice ?? ("" as const),
          paidPercent: i.sale.paidPercent,
          paymentMethod: (i.sale.paymentMethod ?? "") as SaleValues["paymentMethod"],
          soldAt: i.sale.soldAt ? toDateInput(i.sale.soldAt) : "",
          notes: i.sale.notes ?? "",
        }
      : null,
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
