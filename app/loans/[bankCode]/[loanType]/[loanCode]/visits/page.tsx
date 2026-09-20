import { notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/jwt"
import { DashboardHeader } from "@/components/dashboard-header"
import { LoanVisitMap } from "@/components/loan-visit-map"
import { LoanVisitRecorder } from "@/components/loan-visit-recorder"
import { LoanVisitList } from "@/components/loan-visit-list"
import { LoanVisitsAccordion } from "@/components/loan-visits-accordion"
import { LoanOwnerAccountsModal } from "@/components/loan-owner-accounts-modal"
import { LoanDetailsTrigger } from "@/components/loan-details-trigger"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, ChevronRight, MapPin, Phone, ClipboardList, Tag
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LoanDetail, LoanVisitListItem } from "@/types/loan-visit"

const PAGE_SIZE = 5

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

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—"
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

function fmtShortDate(s: string | null | undefined) {
  if (!s) return "None"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

export default async function LoanWorkspacePage({
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

  const dashboardHref = `/dashboard?BankCode=${bankCode}&LoanType=${loanType}&LoanCode=${loanCode}`
  const tagHref = `/loans/${bankCode}/${loanType}/${loanCode}/tag`
  const allVisitsHref = `/loans/${bankCode}/${loanType}/${loanCode}/visits/all`
  const hasLocation = detail.loanAddressLat != null && detail.loanAddressLang != null
  const hasMoreVisits = visits.length > PAGE_SIZE

  // Status derivation
  const loanStatus = (() => {
    if ((detail.balanceLoanAmount ?? 1) === 0)
      return { label: "Settled", bg: "bg-[#DCFCE7]", text: "text-[#166534]", dot: "bg-green-500" }
    if ((detail.arrearsInstallments ?? 0) > 0)
      return { label: "Overdue", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", dot: "bg-red-500" }
    return { label: "Active", bg: "bg-[#DCFCE7]", text: "text-[#166534]", dot: "bg-green-500" }
  })()

  const lastVisitDate = fmtShortDate(visits[0]?.visitedAt)

  // KPI data
  const kpis = [
    { label: "Outstanding", value: fmtCurrency(detail.balanceLoanAmount), bar: "bg-primary" },
    { label: "Interest Rate", value: detail.interestRate != null ? `${detail.interestRate}%` : "—", bar: "bg-blue-400" },
    { label: "Installments", value: detail.numberOfInstallments != null ? `${detail.numberOfInstallments} mo` : "—", bar: "bg-green-500" },
    { label: "Guarantors", value: `${detail.guarantors.length}`, bar: "bg-[#C99A2E]" },
    ...(detail.arrearsInstallments != null && detail.arrearsInstallments > 0
      ? [{ label: "Arrears", value: `${detail.arrearsInstallments} overdue`, bar: "bg-red-500" }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="container mx-auto px-4 py-4 max-w-6xl space-y-4">

        {/* ── Back nav + page title ── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground shrink-0">
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4" />
              {detail.referenceNo}
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-base font-bold text-primary leading-none">Loan Workspace</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail.loanName ?? detail.referenceNo}</p>
          </div>
        </div>

        {/* ── Hero Status Bar ── */}
        <div className="bg-card border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden border-l-4 border-l-primary">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0",
                loanStatus.bg, loanStatus.text
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", loanStatus.dot)} />
                {loanStatus.label}
              </span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Outstanding</p>
                  <p className="text-sm font-bold font-mono text-[#111827]">{fmtCurrency(detail.balanceLoanAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Last Visit</p>
                  <p className="text-sm font-bold text-[#111827]">{lastVisitDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total Visits</p>
                  <p className="text-sm font-bold text-[#111827]">{visits.length}</p>
                </div>
                {detail.arrearsInstallments != null && detail.arrearsInstallments > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Arrears</p>
                    <p className="text-sm font-bold text-red-600">{detail.arrearsInstallments} overdue</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ── Left (2 cols) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Map + Action Panel side by side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

              {/* Map Card */}
              <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                  <p className="text-sm font-bold text-primary">Customer Location</p>
                </div>
                <div className="p-3">
                  {hasLocation ? (
                    <LoanVisitMap
                      lat={detail.loanAddressLat!}
                      lng={detail.loanAddressLang!}
                      loanName={detail.referenceNo}
                      mapClassName="h-[220px]"
                    />
                  ) : (
                    <div className="h-[220px] rounded-lg border bg-muted flex flex-col items-center justify-center gap-3 p-4">
                      <MapPin className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground text-center">
                        No location tagged yet.
                      </p>
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link href={tagHref}>
                          <Tag className="h-3.5 w-3.5" />
                          Tag Location
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Panel */}
              <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                  <p className="text-sm font-bold text-primary">Actions</p>
                </div>
                <div className="p-4 space-y-3">
                  <LoanVisitRecorder
                    loanLocation={hasLocation ? { lat: detail.loanAddressLat!, lng: detail.loanAddressLang! } : null}
                    loan={{ bankCode, loanType, loanCode }}
                  />

                  {/* Secondary actions */}
                  <div className="border-t border-[#F3F4F6] pt-3 space-y-2">
                    <LoanDetailsTrigger loan={{ bankCode, loanType, loanCode, referenceNo: detail.referenceNo, loanName: detail.loanName }} />
                    <LoanOwnerAccountsModal nic={detail.nic} blockAccountNo={detail.blockAccountNo} />
                  </div>
                </div>
              </div>

            </div>

            {/* ── Visit History ── */}
            <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-primary">Visit History</p>
                </div>
                {hasMoreVisits && (
                  <Button variant="ghost" size="sm" asChild className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                    <Link href={allVisitsHref}>
                      View All
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
              <div className="p-4">
                <LoanVisitList
                  initialVisits={visits.slice(0, PAGE_SIZE)}
                  loan={{ bankCode, loanType, loanCode }}
                  guarantors={detail.guarantors}
                />
              </div>
            </div>

          </div>

          {/* ── Right sidebar ── */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4">

            {/* Customer Card */}
            <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                <p className="text-sm font-bold text-primary">Customer</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-[#111827] leading-snug">{detail.loanName ?? "—"}</p>
                  {detail.nic && (
                    <p className="text-xs font-mono text-[#6B7280] mt-0.5">NIC {detail.nic}</p>
                  )}
                </div>

                {detail.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#374151] leading-snug">{detail.address}</p>
                  </div>
                )}

                {(detail.mobilePhone || detail.homePhone) && (
                  <div className="space-y-1.5">
                    {detail.mobilePhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                        <a href={`tel:${detail.mobilePhone}`} className="text-xs text-blue-600 hover:underline font-medium">{detail.mobilePhone}</a>
                        <span className="text-[10px] text-[#9CA3AF] font-medium bg-[#F3F4F6] px-1.5 py-0.5 rounded">Mobile</span>
                      </div>
                    )}
                    {detail.homePhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                        <a href={`tel:${detail.homePhone}`} className="text-xs text-blue-600 hover:underline font-medium">{detail.homePhone}</a>
                        <span className="text-[10px] text-[#9CA3AF] font-medium bg-[#F3F4F6] px-1.5 py-0.5 rounded">Home</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-[#F3F4F6]">
                  <span className="text-xs text-[#6B7280]">
                    <span className="font-medium text-[#374151]">Ref </span>{detail.referenceNo}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    <span className="font-medium text-[#374151]">Branch </span>{detail.bankCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Loan KPI Cards */}
            <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                <p className="text-sm font-bold text-primary">Loan Summary</p>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2.5">
                {kpis.map(({ label, value, bar }) => (
                  <div key={label} className="bg-[#FAFAFA] rounded-lg border border-[#F3F4F6] px-3 py-2.5">
                    <div className={cn("h-0.5 w-6 rounded-full mb-1.5", bar)} />
                    <p className="text-[10px] font-medium text-[#6B7280] leading-none">{label}</p>
                    <p className="text-sm font-bold text-[#111827] font-mono mt-1 leading-none">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Accordion — Repayment / Guarantors / Notes */}
            <div className="bg-card rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <LoanVisitsAccordion detail={detail} />
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
