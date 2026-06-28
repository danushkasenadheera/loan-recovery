import { notFound } from "next/navigation"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { BackButton } from "@/components/back-button"
import { EmployeeLoanFilter } from "@/components/employee-loan-filter"

interface LoanType {
  code: string
  description: string
  isActive: boolean
}

async function fetchLoanTypes(authToken: string): Promise<LoanType[]> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-type`, {
      headers: { Authorization: `Bearer ${authToken}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const types: LoanType[] = await res.json()
    return types.filter(t => t.isActive)
  } catch {
    return []
  }
}

export default async function EmployeeLoanReportPage() {
  const user = await getSession()
  if (!user) notFound()

  const loanTypes = await fetchLoanTypes(user.authToken)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="container mx-auto px-4 py-4 max-w-6xl space-y-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-base font-bold">Employee Wise Loan Report</p>
            <p className="text-xs text-muted-foreground">Filter by employee and loan type to view loans</p>
          </div>
        </div>

        <EmployeeLoanFilter
          loanTypes={loanTypes.map(t => ({ code: t.code, description: t.description }))}
          bankCode={user.bankCode}
        />
      </main>
    </div>
  )
}
