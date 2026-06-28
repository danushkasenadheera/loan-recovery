import { notFound } from "next/navigation"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { BackButton } from "@/components/back-button"
import { RemindersTabs } from "@/components/reminders-tabs"
import type { Reminder } from "@/types/reminder"

interface UserRemindersResponse {
  active: Reminder[]
  completed: Reminder[]
}

async function fetchUserReminders(authToken: string): Promise<UserRemindersResponse> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders/user`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return { active: [], completed: [] }
    return res.json()
  } catch {
    return { active: [], completed: [] }
  }
}

function isOverdue(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return d < today
}

export default async function RemindersPage() {
  const user = await getSession()
  if (!user) notFound()

  const { active, completed } = await fetchUserReminders(user.authToken)
  const overdueCount = active.filter(r => isOverdue(r.reminderDate)).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl space-y-6">

        {/* Page header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-xl font-bold text-primary leading-none">My Reminders</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage customer follow-ups and visit reminders</p>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-xs text-[#6B7280] font-medium">Active</p>
              <p className="text-2xl font-bold text-primary mt-0.5">{active.length}</p>
            </div>
            <div className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-xs text-[#6B7280] font-medium">Overdue</p>
              <p className={`text-2xl font-bold mt-0.5 ${overdueCount > 0 ? "text-red-600" : "text-[#111827]"}`}>{overdueCount}</p>
            </div>
            <div className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-xs text-[#6B7280] font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-0.5">{completed.length}</p>
            </div>
          </div>
        </div>

        <RemindersTabs active={active} completed={completed} />
      </main>
    </div>
  )
}
