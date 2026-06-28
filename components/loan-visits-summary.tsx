import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoanVisitMap } from "@/components/loan-visit-map"
import type { LoanDetail } from "@/types/loan-visit"

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtCurrency(n: number | null) {
  if (n == null) return "—"
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

export function LoanVisitsSummary({ detail }: { detail: LoanDetail }) {
  const hasLocation = detail.loanAddressLat != null && detail.loanAddressLang != null

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">

        {/* Reference + location badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Reference No</p>
            <p className="text-base font-bold font-mono text-secondary leading-tight">{detail.referenceNo}</p>
            {detail.address && (
              <p className="text-xs text-muted-foreground mt-1">{detail.address}</p>
            )}
          </div>
          <Badge variant={hasLocation ? "default" : "secondary"} className="shrink-0 mt-0.5 text-xs">
            {hasLocation ? "Location Tagged" : "Not Tagged"}
          </Badge>
        </div>

        {/* Financial details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-1 border-t">
          <Field label="Loan Amount" value={fmtCurrency(detail.loanAmount)} />
          <Field label="Installment" value={fmtCurrency(detail.installmentAmount)} />
          <Field label="Interest Rate" value={detail.interestRate != null ? `${detail.interestRate}%` : "—"} />
          <Field label="Date of Issue" value={fmtDate(detail.dateOfIssue)} />
          <Field label="Final Payment" value={fmtDate(detail.finalPaymentDate)} />
          <Field label="No of Instalments" value={detail.numberOfInstallments != null ? `${detail.numberOfInstallments} months` : "—"} />
          {detail.blockAccountNo && (
            <Field label="Bank Account" value={detail.blockAccountNo} />
          )}
        </div>

        {/* Guarantors */}
        {detail.guarantors.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guarantors</p>
            {detail.guarantors.map((g, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{g.name ?? "—"}</span>
                <div className="text-right text-xs text-muted-foreground">
                  {g.mobile && <p>{g.mobile}</p>}
                  {g.address && <p className="max-w-[180px] truncate">{g.address}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="border-t pt-3">
          {hasLocation ? (
            <LoanVisitMap
              lat={detail.loanAddressLat!}
              lng={detail.loanAddressLang!}
              loanName={detail.referenceNo}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Location not tagged — visit recording unavailable until location is set.
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
