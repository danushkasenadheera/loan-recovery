import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { LoanSearchForm } from "@/components/loan-search-form"
import { LoanInfoCard } from "@/components/loan-info-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { Button } from "@/components/ui/button"
import { BellRing, BarChart2 } from "lucide-react"

interface LoanType {
  code: string
  description: string
  isActive: boolean
}

export interface Loan {
  bankCode: string
  loanType: string
  loanCode: string
  loanName: string
  loanAddress: string
  loanAddressLat: number | null
  loanAddressLang: number | null
}

async function fetchLoanTypes(authToken: string): Promise<LoanType[]> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-type`, {
      headers: { Authorization: `Bearer ${authToken}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const types: LoanType[] = await res.json()
    return types.filter((t) => t.isActive)
  } catch {
    return []
  }
}

async function fetchLoan(
  authToken: string,
  bankCode: string,
  loanType: string,
  loanCode: string,
): Promise<{ data?: Loan; error?: string }> {
  try {
    const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
    const res = await fetch(`${process.env.API_BASE_URL}/loan?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (res.status === 404) return { error: "Loan not found" }
    if (!res.ok) return { error: "Failed to fetch loan details" }
    return { data: await res.json() }
  } catch {
    return { error: "Unable to connect to server" }
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ BankCode?: string; LoanType?: string; LoanCode?: string }>
}) {
  const user = await getSession()
  if (!user) redirect("/login")

  const { BankCode, LoanType, LoanCode } = await searchParams
  const loanTypes = await fetchLoanTypes(user.authToken)

  const searched = !!(BankCode && LoanType && LoanCode)
  let loan: Loan | null = null
  let loanError: string | null = null

  if (searched) {
    const result = await fetchLoan(user.authToken, BankCode!, LoanType!, LoanCode!)
    if (result.error) loanError = result.error
    else loan = result.data ?? null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/employee-loan-report">
              <BarChart2 className="h-4 w-4" />
              Employee Wise Loan
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/reminders">
              <BellRing className="h-4 w-4" />
              All Reminders
            </Link>
          </Button>
        </div>

        <LoanSearchForm
          loanTypes={loanTypes}
          userBankCode={user.bankCode}
          defaultValues={{
            bankCode: BankCode ?? user.bankCode,
            loanType: LoanType ?? "",
            loanCode: LoanCode ?? "",
          }}
        />

        {searched && loanError && (
          <Alert variant="destructive">
            <AlertDescription>{loanError}</AlertDescription>
          </Alert>
        )}

        {loan && <LoanInfoCard loan={loan} />}
      </main>

      <PWAInstallPrompt />
    </div>
  )
}
