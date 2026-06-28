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

export default async function RemindersPage() {
  const user = await getSession()
  if (!user) notFound()

  const { active, completed } = await fetchUserReminders(user.authToken)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-base font-bold">My Reminders</p>
            <p className="text-xs text-muted-foreground">{active.length} active · last 20 completed</p>
          </div>
        </div>

        <RemindersTabs active={active} completed={completed} />
      </main>
    </div>
  )
}
