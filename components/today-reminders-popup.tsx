"use client"

import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { BellOff } from "lucide-react"
import type { Reminder } from "@/types/reminder"

interface TodayRemindersPopupProps {
  reminders: Reminder[]
  onAttend: (id: number) => void
  onClose: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function TodayRemindersPopup({ reminders, onAttend, onClose }: TodayRemindersPopupProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Today&apos;s Reminders</h3>
        {reminders.length > 0 && (
          <span className="text-xs text-muted-foreground">{reminders.length} pending</span>
        )}
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <BellOff className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No reminders for today</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y">
          {reminders.map(r => {
            const loanHref = `/dashboard?BankCode=${r.bankCode}&LoanType=${r.loanType}&LoanCode=${r.loanCode}`
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  onCheckedChange={() => onAttend(r.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{r.message}</p>
                  <Link
                    href={loanHref}
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-primary mt-0.5 block truncate"
                  >
                    Branch {r.bankCode} — {r.loanType} / {r.loanCode}
                  </Link>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{formatDate(r.reminderDate)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
