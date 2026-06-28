"use client"

import { logoutAction } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"
import { NetworkStatusIndicator } from "@/components/network-status-indicator"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ReminderBadge } from "@/components/reminder-badge"

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
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-foreground">HDC</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-primary leading-none">HDC Coop Bank</p>
              <p className="text-xs text-muted-foreground mt-0.5">Loan Recovery System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NetworkStatusIndicator />
            <ReminderBadge />

            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium leading-none">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.userType} · {user.bankCode}</p>
              </div>
            </div>

            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit" className="gap-1.5 bg-transparent">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
