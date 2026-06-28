"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CalendarClock, CheckCircle2 } from "lucide-react"
import type { Reminder } from "@/types/reminder"

interface Props {
  active: Reminder[]
  completed: Reminder[]
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function getStatus(dateStr: string): "overdue" | "today" | "upcoming" {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  if (d < today) return "overdue"
  if (d.getTime() === today.getTime()) return "today"
  return "upcoming"
}

export function RemindersTabs({ active, completed }: Props) {
  const [tab, setTab] = useState<"active" | "completed">("active")

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-4">
        {[
          { key: "active", label: `Active`, count: active.length },
          { key: "completed", label: `Completed`, count: completed.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key as "active" | "completed")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className={cn(
              "ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold",
              tab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Active tab */}
      {tab === "active" && (
        active.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No active reminders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(r => {
              const status = getStatus(r.reminderDate)
              const loanHref = `/dashboard?BankCode=${r.bankCode}&LoanType=${r.loanType}&LoanCode=${r.loanCode}`
              return (
                <div
                  key={r.id}
                  className={cn(
                    "rounded-lg border p-4",
                    status === "overdue" && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
                    status === "today" && "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
                    status === "upcoming" && "bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug">{r.message}</p>
                      <Link
                        href={loanHref}
                        className="text-xs text-muted-foreground hover:text-primary block"
                      >
                        Branch {r.bankCode} — {r.loanType} / {r.loanCode}
                      </Link>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-xs font-mono font-medium">{fmtDate(r.reminderDate)}</p>
                      <span className={cn(
                        "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                        status === "overdue" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                        status === "today" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                        status === "upcoming" && "bg-muted text-muted-foreground"
                      )}>
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Completed tab */}
      {tab === "completed" && (
        completed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No completed reminders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map(r => {
              const loanHref = `/dashboard?BankCode=${r.bankCode}&LoanType=${r.loanType}&LoanCode=${r.loanCode}`
              return (
                <div key={r.id} className="rounded-lg border bg-card p-4 opacity-70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug line-through text-muted-foreground">{r.message}</p>
                      <Link
                        href={loanHref}
                        className="text-xs text-muted-foreground hover:text-primary block"
                      >
                        Branch {r.bankCode} — {r.loanType} / {r.loanCode}
                      </Link>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Due {fmtDate(r.reminderDate)}</p>
                      {r.attendedAt && (
                        <p className="text-xs text-muted-foreground">Done {fmtDate(r.attendedAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
