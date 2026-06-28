"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function BackButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground shrink-0"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  )
}
