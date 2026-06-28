"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF3] border border-[#BBF7D0]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
        <span className="text-[11px] font-medium text-[#166534] hidden sm:inline leading-none">Online</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
      <WifiOff className="h-3 w-3 text-red-600 shrink-0" />
      <span className="text-[11px] font-medium text-red-700 hidden sm:inline leading-none">Offline</span>
    </div>
  )
}
