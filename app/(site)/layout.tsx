import type { Metadata } from "next"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { getSettings } from "@/lib/queries"
import { fill } from "@/lib/site-texts"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: { default: s.siteTitle, template: `%s — ${s.siteTitle}` },
    description: s.t.seoDescription,
    openGraph: { siteName: s.siteTitle, description: s.t.seoDescription, locale: "pt_BR", type: "website" },
  }
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings()
  return (
    <>
      <SiteHeader title={settings.siteTitle} announcement={settings.announcement} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4">{children}</main>
      <SiteFooter text={fill(settings.t.footerText, { site: settings.siteTitle })} />
    </>
  )
}
