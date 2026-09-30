import { adminPageContext } from "@/lib/admin-auth"
import { CategoriesManager } from "./categories-manager"

export default async function CategoriesPage() {
  const { db } = await adminPageContext()
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  })
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Categorias</h1>
      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder,
          count: c._count.items,
        }))}
      />
    </div>
  )
}
