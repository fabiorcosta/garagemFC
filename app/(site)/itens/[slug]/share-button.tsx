"use client"

import { useEffect } from "react"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/gtag"

export function ShareButton({ title, url }: { title: string; url: string }) {
  async function share() {
    track("share_item", { item_name: title })
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // usuário cancelou
      }
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success("Link copiado!")
  }
  return (
    <Button variant="outline" onClick={share} className="h-11 rounded-full px-5">
      <Share2 />
      Compartilhar
    </Button>
  )
}

export function TrackView({ name, price }: { name: string; price: number }) {
  useEffect(() => {
    track("view_item", { item_name: name, price, currency: "BRL" })
  }, [name, price])
  return null
}
