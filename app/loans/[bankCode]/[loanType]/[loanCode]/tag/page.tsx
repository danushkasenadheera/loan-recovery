import { notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { GoogleMapComponent } from "@/components/google-map"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, Tag, Hash } from "lucide-react"

interface Loan {
  bankCode: string
  loanType: string
  loanCode: string
  loanName: string
  loanAddress: string
  loanAddressLat: number | null
  loanAddressLang: number | null
}

interface Branch {
  bankCode: string
  branchName: string
}

async function fetchLoan(authToken: string, bankCode: string, loanType: string, loanCode: string): Promise<Loan | null> {
  try {
    const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
    const res = await fetch(`${process.env.API_BASE_URL}/loan?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchBranchName(bankCode: string): Promise<string> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/branches`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return bankCode
    const branches: Branch[] = await res.json()
    return branches.find((b) => b.bankCode === bankCode)?.branchName ?? bankCode
  } catch {
    return bankCode
  }
}

export default async function LoanTagPage({
  params,
}: {
  params: Promise<{ bankCode: string; loanType: string; loanCode: string }>
}) {
  const user = await getSession()
  if (!user) notFound()

  const { bankCode, loanType, loanCode } = await params

  const [loan, branchName] = await Promise.all([
    fetchLoan(user.authToken, bankCode, loanType, loanCode),
    fetchBranchName(bankCode),
  ])

  if (!loan) notFound()

  const dashboardHref = `/dashboard?BankCode=${bankCode}&LoanType=${loanType}&LoanCode=${loanCode}`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Back navigation */}
        <div>
          <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Loan info bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Branch
            </div>
            <p className="text-sm font-semibold text-secondary truncate">{branchName}</p>
          </div>
          <div className="bg-card border rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              Loan Type
            </div>
            <p className="text-sm font-semibold text-secondary">{loan.loanType}</p>
          </div>
          <div className="bg-card border rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Loan Code
            </div>
            <p className="text-sm font-semibold text-secondary font-mono">{loan.loanCode}</p>
          </div>
        </div>

        {/* Loan name */}
        <div>
          <h2 className="text-base font-semibold text-foreground">{loan.loanName}</h2>
          {loan.loanAddress && (
            <p className="text-sm text-muted-foreground mt-0.5">{loan.loanAddress}</p>
          )}
        </div>

        {/* Map + tagging controls */}
        <div className="flex-1">
          <GoogleMapComponent
            loanLocation={
              loan.loanAddressLat != null && loan.loanAddressLang != null
                ? { lat: loan.loanAddressLat, lng: loan.loanAddressLang }
                : null
            }
            loanData={loan}
            mapClassName="h-[55vh]"
          />
        </div>
      </main>
    </div>
  )
}
