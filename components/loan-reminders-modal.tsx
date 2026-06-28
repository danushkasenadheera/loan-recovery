"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReminderForm } from "@/components/reminder-form"
import { Loader2, Plus, Pencil, Trash2, BellOff, AlertTriangle } from "lucide-react"
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
  if (status === "attended") return <Badge variant="secondary" className="text-xs">Attended</Badge>
  if (status === "overdue") return <Badge variant="destructive" className="text-xs">Overdue</Badge>
  return <Badge variant="outline" className="text-xs border-primary/50 text-primary">Pending</Badge>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-secondary text-base">
            Reminders — {loan.loanName}
          </DialogTitle>
        </DialogHeader>

        {formMode ? (
          <div className="flex-1 overflow-y-auto py-2">
            <p className="text-sm font-medium mb-4">{formMode === "add" ? "Add Reminder" : "Edit Reminder"}</p>
            <ReminderForm
              loan={loan}
              reminder={editTarget ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => { setFormMode(null); setEditTarget(null) }}
            />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <TabsList className="h-8">
                <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All Mine</TabsTrigger>
                <TabsTrigger value="loan" className="text-xs">All Loan</TabsTrigger>
              </TabsList>
              {showActions && (
                <Button size="sm" onClick={() => setFormMode("add")} className="h-8 gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>

            {["upcoming", "all", "loan"].map(t => (
              <TabsContent key={t} value={t} className="flex-1 overflow-y-auto mt-3 min-h-0">
                {error && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {deleteId !== null && (
                  <Alert className="mb-3">
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Delete this reminder?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-12">
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
                          className={`rounded-lg border p-3 space-y-1.5 ${status === "attended" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug flex-1 ${status === "attended" ? "line-through text-muted-foreground" : ""}`}>
                              {r.message}
                            </p>
                            <StatusBadge reminder={r} />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>{formatDate(r.reminderDate)}</p>
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
                                  className="h-7 w-7 p-0"
                                  onClick={() => { setEditTarget(r); setFormMode("edit") }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
