"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Bell, BellOff, CheckCircle2, Pencil, Trash2, ExternalLink, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReminderForm } from "@/components/reminder-form"
import type { Reminder } from "@/types/reminder"

type TabKey = "active" | "overdue" | "today" | "completed"

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

const accentBar: Record<string, string> = {
  overdue: "border-l-red-500",
  today:   "border-l-[#C99A2E]",
  upcoming:"border-l-blue-400",
  completed:"border-l-green-500",
}

const statusBadge: Record<string, string> = {
  overdue:  "bg-[#FEE2E2] text-[#991B1B]",
  today:    "bg-amber-100 text-amber-800",
  upcoming: "bg-blue-50 text-blue-700",
  completed:"bg-[#DCFCE7] text-[#166534]",
}

const statusLabel: Record<string, string> = {
  overdue:  "Overdue",
  today:    "Due Today",
  upcoming: "Upcoming",
  completed:"Completed",
}

interface Props {
  active: Reminder[]
  completed: Reminder[]
}

export function RemindersTabs({ active: initialActive, completed: initialCompleted }: Props) {
  const [tab, setTab] = useState<TabKey>("active")
  const [activeList, setActiveList] = useState<Reminder[]>(initialActive)
  const [completedList, setCompletedList] = useState<Reminder[]>(initialCompleted)
  const [attending, setAttending] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Reminder | null>(null)

  const overdueList = activeList.filter(r => getStatus(r.reminderDate) === "overdue")
  const todayList   = activeList.filter(r => getStatus(r.reminderDate) === "today")

  const tabs = [
    { key: "active"    as const, label: "Active",    count: activeList.length },
    { key: "overdue"   as const, label: "Overdue",   count: overdueList.length },
    { key: "today"     as const, label: "Today",     count: todayList.length },
    { key: "completed" as const, label: "Completed", count: completedList.length },
  ]

  const visibleList =
    tab === "active"    ? activeList :
    tab === "overdue"   ? overdueList :
    tab === "today"     ? todayList :
    completedList

  const notifyChange = () => window.dispatchEvent(new CustomEvent("reminders:changed"))

  const handleAttend = async (id: number) => {
    setAttending(id)
    try {
      const res = await fetch(`/api/reminders/${id}/attend`, { method: "PUT" })
      if (res.ok) {
        const updated: Reminder = await res.json()
        setActiveList(prev => prev.filter(r => r.id !== id))
        setCompletedList(prev => [updated, ...prev])
        notifyChange()
      }
    } finally {
      setAttending(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" })
      if (res.ok) {
        setActiveList(prev => prev.filter(r => r.id !== id))
        setCompletedList(prev => prev.filter(r => r.id !== id))
        setDeleteTarget(null)
        notifyChange()
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSuccess = (updated: Reminder) => {
    setActiveList(prev => prev.map(r => r.id === updated.id ? updated : r))
    setEditTarget(null)
  }

  const isCompletedTab = tab === "completed"

  return (
    <>
      {/* Pill tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              tab === key
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-muted-foreground border-[#E5E7EB] hover:border-primary/40 hover:text-foreground"
            )}
          >
            {label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center",
              tab === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visibleList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          {isCompletedTab
            ? <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
            : <BellOff className="h-10 w-10 text-muted-foreground/20" />
          }
          <p className="text-sm text-muted-foreground">
            {isCompletedTab ? "No completed reminders" : `No ${tab} reminders`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleList.map(r => {
            const status = isCompletedTab ? "completed" : getStatus(r.reminderDate)
            const loanHref = `/dashboard?BankCode=${r.bankCode}&LoanType=${r.loanType}&LoanCode=${r.loanCode}`
            const isConfirmingDelete = deleteTarget === r.id

            return (
              <div
                key={r.id}
                className={cn(
                  "bg-card border border-[#E5E7EB] rounded-2xl overflow-hidden border-l-4",
                  "shadow-[0_2px_10px_rgba(15,23,42,0.05)]",
                  accentBar[status],
                  isCompletedTab && "opacity-70"
                )}
              >
                <div className="px-5 py-4 space-y-3">

                  {/* Message + status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <Bell className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <p className={cn(
                        "text-sm font-semibold leading-snug text-[#111827]",
                        isCompletedTab && "line-through text-muted-foreground"
                      )}>
                        {r.message}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide",
                      statusBadge[status]
                    )}>
                      {statusLabel[status]}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[26px]">
                    <span className="text-xs text-[#6B7280]">Branch {r.bankCode} · {r.loanType} / {r.loanCode}</span>
                    <span className="text-xs text-[#6B7280]">{fmtDate(r.reminderDate)}</span>
                    {isCompletedTab && r.attendedAt && (
                      <span className="text-xs text-green-600 font-medium">Done {fmtDate(r.attendedAt)}</span>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  {isConfirmingDelete && (
                    <div className="flex items-center gap-3 pl-[26px] pt-1">
                      <p className="text-sm text-destructive font-medium">Delete this reminder?</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-3 text-xs"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting}
                      >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Action row */}
                  {!isConfirmingDelete && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F3F4F6] pl-[26px]">
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5" asChild>
                        <Link href={loanHref}>
                          <ExternalLink className="h-3 w-3" />
                          View Loan
                        </Link>
                      </Button>
                      {!isCompletedTab && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100"
                            onClick={() => handleAttend(r.id)}
                            disabled={attending === r.id}
                          >
                            {attending === r.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Check className="h-3 w-3" />
                            }
                            Mark Done
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditTarget(r)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5"
                            onClick={() => setDeleteTarget(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-primary font-bold text-base">Edit Reminder</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ReminderForm
              loan={{ bankCode: editTarget.bankCode, loanType: editTarget.loanType, loanCode: editTarget.loanCode }}
              reminder={editTarget}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
