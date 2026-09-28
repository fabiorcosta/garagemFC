import { getSettings } from "@/lib/queries"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const s = await getSettings()
  // Data final no fuso de Brasília, no formato do <input type="date">
  const saleEndDate = s.saleEndDate
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(s.saleEndDate)
    : ""
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Configurações</h1>
      <SettingsForm
        initial={{
          siteTitle: s.siteTitle,
          heroTitle: s.heroTitle,
          heroSubtitle: s.heroSubtitle,
          whatsapp: s.whatsapp,
          saleEndDate,
          pickupCity: s.pickupCity,
          pickupNeighborhood: s.pickupNeighborhood,
          pickupInfo: s.pickupInfo,
          paymentInfo: s.paymentInfo,
          announcement: s.announcement,
        }}
      />
    </div>
  )
}
