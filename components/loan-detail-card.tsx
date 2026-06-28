import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, User } from "lucide-react"
import type { LoanDetail } from "@/types/loan-visit"

function fmt(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtCurrency(amount: number | null) {
  if (amount == null) return "—"
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

function fmtPct(rate: number | null) {
  if (rate == null) return "—"
  return `${rate}%`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  )
}

export function LoanDetailCard({ detail }: { detail: LoanDetail }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-secondary text-base">
            <FileText className="h-4 w-4" />
            Loan Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-muted-foreground">Reference No</dt>
              <dd className="text-sm font-semibold font-mono mt-0.5 text-secondary">{detail.referenceNo}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Field label="Address" value={detail.address ?? ""} />
            </div>
            <Field label="Bank Account" value={detail.blockAccountNo ?? ""} />
            <Field label="Loan Amount" value={fmtCurrency(detail.loanAmount)} />
            <Field label="Date of Issue" value={fmt(detail.dateOfIssue)} />
            <Field label="Loan Installment" value={fmtCurrency(detail.installmentAmount)} />
            <Field label="Final Payment Date" value={fmt(detail.finalPaymentDate)} />
            <Field label="Interest Rate" value={fmtPct(detail.interestRate)} />
            <Field label="No of Installments" value={detail.numberOfInstallments?.toString() ?? "—"} />
          </dl>
        </CardContent>
      </Card>

      {detail.guarantors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-secondary text-base">
              <User className="h-4 w-4" />
              Guarantors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.guarantors.map((g, i) => (
              <div key={i} className={i > 0 ? "pt-4 border-t" : ""}>
                <p className="text-xs text-muted-foreground mb-2">Guarantor {i + 1}</p>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Name" value={g.name ?? ""} />
                  <Field label="Address" value={g.address ?? ""} />
                  <Field label="Mobile" value={g.mobile ?? ""} />
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
