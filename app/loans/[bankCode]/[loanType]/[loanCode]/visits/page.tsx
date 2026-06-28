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
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ClipboardList, ChevronRight } from "lucide-react"
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

export default async function LoanVisitsPage({
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
  const allVisitsHref = `/loans/${bankCode}/${loanType}/${loanCode}/visits/all`
  const hasLocation = detail.loanAddressLat != null && detail.loanAddressLang != null
  const hasMoreVisits = visits.length > PAGE_SIZE

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader user={{ name: user.userName, bankCode: user.bankCode, userType: user.userType }} />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-6xl space-y-4">

        {/* Back + loan reference */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground shrink-0">
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-base font-bold truncate">Loan # {detail.referenceNo}</p>
            <p className="text-xs text-muted-foreground truncate">
              {detail.loanName ?? ""}
              {detail.nic && <> <span className="mx-1 opacity-40">—</span><span className="font-mono">{detail.nic}</span></>}
            </p>
          </div>
        </div>

        {/* Main grid: 2/3 content + 1/3 sidebar */}
        <div className="grid grid-cols-3 gap-4 items-start">

          {/* Left: full 2 columns */}
          <div className="col-span-2 space-y-4">

            {/* Visit Action — horizontal: map left, controls right */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-4 items-stretch">

                  {/* Map — left ~45% */}
                  <div className="w-[45%] shrink-0">
                    {hasLocation ? (
                      <LoanVisitMap
                        lat={detail.loanAddressLat!}
                        lng={detail.loanAddressLang!}
                        loanName={detail.referenceNo}
                        mapClassName="h-[200px]"
                      />
                    ) : (
                      <div className="h-[200px] rounded-lg border bg-muted flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center px-4">
                          Location not tagged.<br />Tag a location to enable visit recording.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Controls — right ~55% */}
                  <div className="flex-1 flex flex-col justify-center gap-3 py-1">
                    <LoanVisitRecorder
                      loanLocation={hasLocation ? { lat: detail.loanAddressLat!, lng: detail.loanAddressLang! } : null}
                      loan={{ bankCode, loanType, loanCode }}
                    />
                    <LoanOwnerAccountsModal nic={detail.nic} blockAccountNo={detail.blockAccountNo} />
                    <LoanDetailsTrigger loan={{ bankCode, loanType, loanCode, referenceNo: detail.referenceNo, loanName: detail.loanName }} />
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      Make sure you are within 25m of the customer location to record a visit
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Visit History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Visit History</span>
                </div>
                {hasMoreVisits && (
                  <Button variant="ghost" size="sm" asChild className="gap-1 text-xs h-7 px-2">
                    <Link href={allVisitsHref}>
                      View All Visits
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
              <LoanVisitList
                initialVisits={visits.slice(0, PAGE_SIZE)}
                loan={{ bankCode, loanType, loanCode }}
              />
            </div>

          </div>

          {/* Right: sticky accordion sidebar */}
          <div className="col-span-1 sticky top-4">
            <LoanVisitsAccordion detail={detail} />
          </div>

        </div>
      </main>
    </div>
  )
}
