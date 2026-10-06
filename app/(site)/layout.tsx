import type { Metadata } from "next"
import { CookieBanner } from "@/components/cookie-banner"
import { DisclaimerProvider } from "@/components/disclaimer"
import { disclaimerVersion } from "@/lib/disclaimer"
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
      <DisclaimerProvider
        texts={{
          title: settings.t.disclaimerTitle,
          body: settings.t.disclaimerBody,
          checkbox: settings.t.disclaimerCheckbox,
          confirm: settings.t.disclaimerConfirm,
          whatsappNote: settings.t.disclaimerWhatsappNote,
          version: disclaimerVersion(settings.t),
        }}
      >
        <main className="mx-auto w-full max-w-6xl flex-1 px-4">{children}</main>
      </DisclaimerProvider>
      <SiteFooter text={fill(settings.t.footerText, { site: settings.siteTitle })} privacyLabel={settings.t.footerPrivacyLink} />
      <CookieBanner
        texts={{ text: settings.t.cookieText, accept: settings.t.cookieAccept, reject: settings.t.cookieReject, more: settings.t.cookieMore }}
      />
    </>
  )
}
