"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "pwa-install-dismissed-at"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isSnoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY))
    return at > 0 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

function snooze() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {}
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!isSnoozed()) setVisible(true)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setVisible(false)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "dismissed") snooze()
    setDeferredPrompt(null)
    setVisible(false)
  }

  const handleClose = () => {
    snooze()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">HDC</span>
            </div>
            <CardTitle className="text-sm">Install App</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose} aria-label="Dismiss install prompt">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Add HDC Loan Recovery to your home screen for quick access
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button onClick={handleInstall} size="sm" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </CardContent>
    </Card>
  )
}
