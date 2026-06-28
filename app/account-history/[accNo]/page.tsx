import { notFound } from "next/navigation"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { BackButton } from "@/components/back-button"
import { cn } from "@/lib/utils"

interface AccountBalanceEntry {
  accNo: string | null
  date: string | null
  remarks: string | null
  creditAmount: number | null
  debitAmount: number | null
  sequence: number | null
  time: string | null
  branchCode: string | null
  runningBalance: number | null
}

async function fetchAccountHistory(authToken: string, accNo: string): Promise<AccountBalanceEntry[]> {
  try {
    const params = new URLSearchParams({ AccountNo: accNo, Records: "50" })
    const res = await fetch(`${process.env.API_BASE_URL}/account-balance-report?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtTime(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function fmtCurrency(amount: number | null) {
  if (amount == null || amount === 0) return null
  return amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })
}

function fmtBalance(amount: number | null) {
  if (amount == null) return "—"
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

export default async function AccountHistoryPage({
  params,
}: {
  params: Promise<{ accNo: string }>
}) {
  const user = await getSession()
  if (!user) notFound()

  const { accNo } = await params
  const decodedAccNo = decodeURIComponent(accNo)

  const entries = await fetchAccountHistory(user.authToken, decodedAccNo)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-5xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="min-w-0">
            <p className="text-base font-bold font-mono">{decodedAccNo}</p>
            <p className="text-xs text-muted-foreground">Last 50 transactions</p>
          </div>
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No transactions found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2.5 font-medium">Date</th>
                  <th className="text-left px-3 py-2.5 font-medium">Time</th>
                  <th className="text-left px-3 py-2.5 font-medium">Remarks</th>
                  <th className="text-right px-3 py-2.5 font-medium text-green-700">Credit</th>
                  <th className="text-right px-3 py-2.5 font-medium text-red-600">Debit</th>
                  <th className="text-right px-3 py-2.5 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry, i) => {
                  const credit = fmtCurrency(entry.creditAmount)
                  const debit = fmtCurrency(entry.debitAmount)
                  return (
                    <tr
                      key={i}
                      className={cn(
                        credit && !debit ? "bg-green-50/50 dark:bg-green-950/10" : "",
                        debit && !credit ? "bg-red-50/50 dark:bg-red-950/10" : "",
                      )}
                    >
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{fmt(entry.date)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtTime(entry.time)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate">{entry.remarks || "—"}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-green-700">{credit ?? ""}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-red-600">{debit ?? ""}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-medium">{fmtBalance(entry.runningBalance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
