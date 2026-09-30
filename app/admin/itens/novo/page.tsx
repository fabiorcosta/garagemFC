import { db } from "@/lib/db"
import { getSettings } from "@/lib/queries"
import { ItemForm } from "../item-form"

export default async function NewItemPage() {
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } })
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Novo item</h1>
      <ItemForm
        conditions={(await getSettings()).t.conditions.split("\n").map((c) => c.trim()).filter(Boolean)}
        categories={categories}
        initial={{
          title: "",
          description: "",
          price: "",
          originalPrice: "",
          condition: "Bom estado",
          status: "disponivel",
          acceptsOffers: false,
          featured: false,
          categoryId: "",
          photos: [],
        }}
      />
    </div>
  )
}
