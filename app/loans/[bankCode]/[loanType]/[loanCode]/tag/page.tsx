import { notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { GoogleMapComponent } from "@/components/google-map"
import { ArrowLeft, MapPin } from "lucide-react"

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
    const res = await fetch(`${process.env.API_BASE_URL}/branches`, { next: { revalidate: 3600 } })
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

  const hasLocation = loan.loanAddressLat != null && loan.loanAddressLang != null
  const dashboardHref = `/dashboard?BankCode=${bankCode}&LoanType=${loanType}&LoanCode=${loanCode}`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 flex flex-col gap-3 px-4 py-3 min-h-0">

        {/* Breadcrumb-style back nav */}
        <div className="flex items-center gap-1.5">
          <Link
            href={dashboardHref}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Loan {loan.loanCode}
          </Link>
          <span className="text-muted-foreground/40 text-sm">/</span>
          <span className="text-sm font-medium text-foreground">Tag Location</span>
        </div>

        <h1 className="text-lg font-bold text-primary -mt-1">Tag Customer Location</h1>

        {/* Compact loan summary card */}
        <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.05)] border-l-4 border-l-[#C99A2E]">
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#111827] leading-snug">{loan.loanName}</p>
                {loan.loanAddress && (
                  <p className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {loan.loanAddress}
                  </p>
                )}
              </div>
              {hasLocation ? (
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] whitespace-nowrap">
                  ● Tagged
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] whitespace-nowrap">
                  ● Not Tagged
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="text-xs text-[#6B7280]">
                <span className="font-medium text-[#374151]">Branch </span>{branchName}
              </span>
              <span className="text-xs text-[#6B7280]">
                <span className="font-medium text-[#374151]">Loan </span>{loan.loanCode}
              </span>
              <span className="text-xs text-[#6B7280]">
                <span className="font-medium text-[#374151]">Type </span>{loan.loanType}
              </span>
            </div>
          </div>
        </div>

        {/* Gold field task banner */}
        <div className="bg-[#FFF8E6] border border-[#F0D9A0] rounded-xl px-4 py-2.5 flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-[#C99A2E] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-primary">Field Task</p>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Capture the customer&apos;s current location to assist future recovery visits.
            </p>
          </div>
        </div>

        {/* Map + controls — flex-1 + min-h-0 lets this grow to fill remaining space */}
        <div className="flex-1 min-h-0 flex flex-col">
          <GoogleMapComponent
            loanLocation={hasLocation ? { lat: loan.loanAddressLat!, lng: loan.loanAddressLang! } : null}
            loanData={loan}
            dashboardHref={dashboardHref}
          />
        </div>

      </main>
    </div>
  )
}
