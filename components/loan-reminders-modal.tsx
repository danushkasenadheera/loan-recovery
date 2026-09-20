"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ReminderForm } from "@/components/reminder-form"
import { Loader2, Plus, Pencil, Trash2, BellOff, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Reminder } from "@/types/reminder"

type TabKey = "upcoming" | "all" | "loan"

function getReminderStatus(r: Reminder): "attended" | "overdue" | "pending" {
  if (r.isAttended) return "attended"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(r.reminderDate) < today ? "overdue" : "pending"
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function StatusBadge({ reminder }: { reminder: Reminder }) {
  const status = getReminderStatus(reminder)
  if (status === "attended") return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] shrink-0">Attended</span>
  )
  if (status === "overdue") return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] shrink-0">Overdue</span>
  )
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] shrink-0">Pending</span>
  )
}

interface LoanRemindersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: { bankCode: string; loanType: string; loanCode: string; loanName: string }
}

export function LoanRemindersModal({ open, onOpenChange, loan }: LoanRemindersModalProps) {
  const [tab, setTab] = useState<TabKey>("upcoming")
  const [items, setItems] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null)
  const [editTarget, setEditTarget] = useState<Reminder | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async (scope: TabKey) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        BankCode: loan.bankCode,
        LoanType: loan.loanType,
        LoanCode: loan.loanCode,
        Scope: scope,
      })
      const res = await fetch(`/api/reminders?${params}`)
      if (res.ok) setItems(await res.json())
      else setError("Failed to load reminders")
    } catch {
      setError("Unable to connect to server")
    } finally {
      setLoading(false)
    }
  }, [loan.bankCode, loan.loanType, loan.loanCode])

  useEffect(() => {
    if (open) fetchList(tab)
  }, [open, tab, fetchList])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const handleTabChange = (value: string) => {
    setTab(value as TabKey)
    setFormMode(null)
    setEditTarget(null)
    setDeleteId(null)
    setError("")
  }

  const notifyChange = () => window.dispatchEvent(new CustomEvent("reminders:changed"))

  const handleFormSuccess = () => {
    setFormMode(null)
    setEditTarget(null)
    fetchList(tab)
    notifyChange()
  }

  const handleAttend = async (id: number) => {
    const res = await fetch(`/api/reminders/${id}/attend`, { method: "PUT" })
    if (res.ok) {
      const updated: Reminder = await res.json()
      if (tab === "upcoming") {
        setItems(prev => prev.filter(r => r.id !== id))
      } else {
        setItems(prev => prev.map(r => r.id === id ? updated : r))
      }
      notifyChange()
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reminders/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        setItems(prev => prev.filter(r => r.id !== deleteId))
        setDeleteId(null)
        notifyChange()
      }
    } finally {
      setDeleting(false)
    }
  }

  const showActions = tab !== "loan"

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[rgba(15,23,42,.45)] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-[0_20px_80px_rgba(15,23,42,.3)] flex flex-col my-auto">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-[#E9D9C5]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-primary">Reminders</p>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="px-5 py-3 space-y-0.5">
            <p className="text-xs font-semibold text-[#374151] truncate">{loan.loanName}</p>
            <p className="text-[10px] font-mono text-[#9CA3AF]">{loan.bankCode}/{loan.loanCode}/{loan.loanType}</p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto max-h-[70vh] px-5 py-5 space-y-4">

          {formMode ? (
            /* Add / Edit form */
            <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
              <div className="px-4 py-2.5 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  {formMode === "add" ? "Add Reminder" : "Edit Reminder"}
                </p>
              </div>
              <div className="px-4 py-4">
                <ReminderForm
                  loan={loan}
                  reminder={editTarget ?? undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={() => { setFormMode(null); setEditTarget(null) }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Tabs bar + Add button */}
              <div className="flex items-center justify-between gap-2">
                <Tabs value={tab} onValueChange={handleTabChange}>
                  <TabsList className="h-8">
                    <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">All Mine</TabsTrigger>
                    <TabsTrigger value="loan" className="text-xs">All Loan</TabsTrigger>
                  </TabsList>
                </Tabs>
                {showActions && (
                  <Button size="sm" onClick={() => setFormMode("add")} className="h-8 gap-1.5 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-[#FEF2F2] px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* Delete confirm */}
              {deleteId !== null && (
                <div className="rounded-xl border border-red-200 bg-[#FEF2F2] px-4 py-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-red-700">Delete this reminder?</p>
                  </div>
                  <div className="flex gap-2 pl-6">
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* List content */}
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No reminders found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map(r => {
                    const status = getReminderStatus(r)
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "bg-card border border-[#E5E7EB] rounded-xl px-4 py-3.5 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
                          status === "attended" && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm leading-snug flex-1",
                            status === "attended" ? "line-through text-muted-foreground" : "text-[#111827]"
                          )}>
                            {r.message}
                          </p>
                          <StatusBadge reminder={r} />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-[#6B7280] space-y-0.5">
                            <p className="font-mono">{formatDate(r.reminderDate)}</p>
                            {r.isAttended && r.attendedAt && (
                              <p>Attended: {formatDate(r.attendedAt)}</p>
                            )}
                          </div>

                          {showActions && (
                            <div className="flex items-center gap-2 shrink-0">
                              {!r.isAttended && (
                                <div className="flex items-center gap-1.5">
                                  <Checkbox
                                    id={`attend-${r.id}`}
                                    onCheckedChange={() => handleAttend(r.id)}
                                  />
                                  <label htmlFor={`attend-${r.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                    Done
                                  </label>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#6B7280] hover:text-primary"
                                onClick={() => { setEditTarget(r); setFormMode("edit") }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#6B7280] hover:text-destructive"
                                onClick={() => setDeleteId(r.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
