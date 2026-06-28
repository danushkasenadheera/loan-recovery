import { notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { LoanVisitList } from "@/components/loan-visit-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, User, ClipboardList } from "lucide-react"
import type { LoanDetail, LoanVisitListItem } from "@/types/loan-visit"

async function fetchLoanDetail(authToken: string, bankCode: string, loanType: string, loanCode: string): Promise<LoanDetail | null> {
  try {
    const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
    const res = await fetch(`${process.env.API_BASE_URL}/loan-details?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchVisits(authToken: string, bankCode: string, loanType: string, loanCode: string): Promise<LoanVisitListItem[]> {
  try {
    const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
    const res = await fetch(`${process.env.API_BASE_URL}/loan-visits?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function LoanVisitsAllPage({
  params,
}: {
  params: Promise<{ bankCode: string; loanType: string; loanCode: string }>
}) {
  const user = await getSession()
  if (!user) notFound()

  const { bankCode, loanType, loanCode } = await params

  const [detail, visits] = await Promise.all([
    fetchLoanDetail(user.authToken, bankCode, loanType, loanCode),
    fetchVisits(user.authToken, bankCode, loanType, loanCode),
  ])

  if (!detail) notFound()

  const visitsHref = `/loans/${bankCode}/${loanType}/${loanCode}/visits`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-3xl space-y-4">

        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href={visitsHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to Visits
          </Link>
        </Button>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">All Visits — Loan # {detail.referenceNo}</h1>
          {detail.loanName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" />
              {detail.loanName}
            </p>
          )}
          {detail.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {detail.address}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Visit History</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {visits.length} record{visits.length !== 1 ? "s" : ""}
            </span>
          </div>
          <LoanVisitList
            initialVisits={visits}
            loan={{ bankCode, loanType, loanCode }}
          />
        </div>

      </main>
    </div>
  )
}
