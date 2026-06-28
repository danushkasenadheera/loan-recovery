"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { TodayRemindersPopup } from "@/components/today-reminders-popup"
import type { Reminder } from "@/types/reminder"

export function ReminderBadge() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [open, setOpen] = useState(false)

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders/today")
      if (res.ok) setReminders(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchToday()
    window.addEventListener("reminders:changed", fetchToday)
    return () => window.removeEventListener("reminders:changed", fetchToday)
  }, [fetchToday])

  const handleAttend = async (id: number) => {
    const res = await fetch(`/api/reminders/${id}/attend`, { method: "PUT" })
    if (res.ok) setReminders(prev => prev.filter(r => r.id !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
          <Bell className="h-4 w-4" />
          {reminders.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {reminders.length > 9 ? "9+" : reminders.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <TodayRemindersPopup
          reminders={reminders}
          onAttend={handleAttend}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
