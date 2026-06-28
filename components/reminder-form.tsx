"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import type { Reminder } from "@/types/reminder"

interface ReminderFormProps {
  loan: { bankCode: string; loanType: string; loanCode: string }
  reminder?: Reminder
  onSuccess: (reminder: Reminder) => void
  onCancel: () => void
}

export function ReminderForm({ loan, reminder, onSuccess, onCancel }: ReminderFormProps) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(reminder ? reminder.reminderDate.split("T")[0] : today)
  const [message, setMessage] = useState(reminder?.message ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) { setError("Message is required"); return }
    setLoading(true)
    setError("")
    try {
      const url = reminder ? `/api/reminders/${reminder.id}` : "/api/reminders"
      const method = reminder ? "PUT" : "POST"
      const body = reminder
        ? { reminderDate: date, message: message.trim() }
        : { bankCode: loan.bankCode, loanType: loan.loanType, loanCode: loan.loanCode, reminderDate: date, message: message.trim() }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError("Failed to save reminder"); return }
      onSuccess(await res.json())
    } catch {
      setError("Unable to connect to server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="r-date">Date</Label>
        <Input
          id="r-date"
          type="date"
          value={date}
          min={reminder ? undefined : today}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-message">Message</Label>
        <Textarea
          id="r-message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Enter reminder message..."
          rows={3}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : reminder ? "Update" : "Add Reminder"}
        </Button>
      </div>
    </form>
  )
}
