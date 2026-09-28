import { SiteFooter, SiteHeader } from "@/components/site-header"
import { getSettings } from "@/lib/queries"

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings()
  return (
    <>
      <SiteHeader title={settings.siteTitle} announcement={settings.announcement} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4">{children}</main>
      <SiteFooter title={settings.siteTitle} />
    </>
  )
}
