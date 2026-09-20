"use client"

import { useState } from "react"
import { logoutAction } from "@/app/actions/auth-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NetworkStatusIndicator } from "@/components/network-status-indicator"
import { ReminderBadge } from "@/components/reminder-badge"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ChevronDown, LogOut } from "lucide-react"

interface DashboardHeaderProps {
  user: {
    name?: string | null
    bankCode: string
    userType: string
  }
}

function getInitials(name?: string | null) {
  if (!name) return "U"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const roleLabel = user.userType === "Admin" ? "Administrator" : "Field Officer"

  return (
    <header className="bg-card border-t-4 border-t-[#C99A2E] shadow-[0_2px_10px_rgba(15,23,42,0.06)] sticky top-0 z-40">
      <div className="flex items-stretch min-h-[56px]">

        {/* Maroon identity panel */}
        <div className="w-14 sm:w-20 bg-primary flex items-center justify-center shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
            <span className="text-xs font-bold text-white tracking-wide">HDC</span>
          </div>
        </div>

        {/* Header content */}
        <div className="flex-1 flex items-center justify-between px-4">

          {/* Brand */}
          <div>
            <p className="text-sm font-bold text-primary leading-none">HDC Coop Bank</p>
            <p className="text-xs text-muted-foreground mt-0.5">Loan Recovery System</p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkStatusIndicator />
            <ReminderBadge />
            <PWAInstallPrompt />

            {/* Profile dropdown */}
            <Popover open={profileOpen} onOpenChange={setProfileOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" className="w-52 p-2">
                <div className="px-2 py-2 mb-1 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">{user.name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{roleLabel}</p>
                  <p className="text-[10px] text-muted-foreground">Branch {user.bankCode}</p>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive rounded-md hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>

      </div>
    </header>
  )
}
