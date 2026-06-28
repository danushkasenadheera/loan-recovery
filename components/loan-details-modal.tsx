"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LoanDetailReport } from "@/types/loan-visit"

interface LoanDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: { bankCode: string; loanType: string; loanCode: string; referenceNo: string }
}

function fmtAmt(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toLocaleString("en-LK", { minimumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function LoanDetailsModal({ open, onOpenChange, loan }: LoanDetailsModalProps) {
  const [data, setData] = useState<LoanDetailReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || data) return
    setLoading(true)
    const params = new URLSearchParams({
      BankCode: loan.bankCode,
      LoanType: loan.loanType,
      LoanCode: loan.loanCode,
    })
    fetch(`/api/loan-detail-report?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  const summary = data?.summary
  const history = data?.paymentHistory ?? []
  const totals = data?.totals

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" aria-modal="true" role="dialog">

      {/* Sticky header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div>
          <p className="text-sm font-bold font-mono">{loan.referenceNo}</p>
          <p className="text-xs text-muted-foreground">Loan Details</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="Close loan details"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Failed to load loan details.</p>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-6 max-w-5xl space-y-8">

            {/* Outstanding Balance */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Outstanding Balance</p>
              <div className="rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Outstanding", value: summary?.totalOutstanding, bold: true },
                    { label: "Loan Balance", value: summary?.remainingPrincipalBalance },
                    { label: "Interest to Pay", value: summary?.interestToBePaidUptoToday },
                    { label: "Penalty Interest", value: summary?.penaltyInterestToBePaidUptoToday },
                  ].map(({ label, value, bold }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`font-mono ${bold ? "text-base font-bold" : "text-sm font-semibold"}`}>Rs. {fmtAmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Loan Summary */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Loan Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Opening Principal", value: `Rs. ${fmtAmt(summary?.openingPrincipal)}` },
                  { label: "Installments Paid", value: summary?.noOfInstallmentsPaid?.toString() ?? "—" },
                  { label: "Principal Paid", value: `Rs. ${fmtAmt(summary?.principalPaid)}` },
                  { label: "Interest Paid", value: `Rs. ${fmtAmt(summary?.interestPaid)}` },
                  { label: "Penalty Paid", value: `Rs. ${fmtAmt(summary?.penaltyPaid)}` },
                  { label: "Loan Balance", value: `Rs. ${fmtAmt(summary?.remainingPrincipalBalance)}`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-lg border p-3 space-y-1 ${highlight ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-card"}`}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold font-mono">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment History */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Payment History ({history.length} transactions)
              </p>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No payment history found.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted text-muted-foreground">
                          <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">Date</th>
                          <th className="text-left px-3 py-2.5 font-medium">Remarks</th>
                          <th className="text-right px-3 py-2.5 font-medium whitespace-nowrap">Principal</th>
                          <th className="text-right px-3 py-2.5 font-medium whitespace-nowrap text-blue-600">Interest</th>
                          <th className="text-right px-3 py-2.5 font-medium whitespace-nowrap text-orange-600">Penalty</th>
                          <th className="text-right px-3 py-2.5 font-medium whitespace-nowrap">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {history.map((entry, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(entry.date)}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">{entry.remarks || "—"}</td>
                            <td className="px-3 py-2 text-right font-mono">{entry.principal > 0 ? fmtAmt(entry.principal) : "—"}</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">{entry.interest > 0 ? fmtAmt(entry.interest) : "—"}</td>
                            <td className="px-3 py-2 text-right font-mono text-orange-600">{entry.penalty > 0 ? fmtAmt(entry.penalty) : "—"}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium">{fmtAmt(entry.runningPrincipalBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-semibold border-t-2 border-border">
                          <td className="px-3 py-2.5 text-xs" colSpan={2}>TOTAL</td>
                          <td className="px-3 py-2.5 text-right font-mono">{fmtAmt(totals?.totalPrincipal)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-blue-600">{fmtAmt(totals?.totalInterest)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-orange-600">{fmtAmt(totals?.totalPenalty)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{fmtAmt(totals?.loanBalance)}</td>
                        </tr>
                        <tr className="bg-muted/50 border-t">
                          <td className="px-3 py-1.5 text-xs text-muted-foreground" colSpan={2}>
                            Total Paid (Principal + Interest + Penalty)
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold" colSpan={4}>
                            LKR {fmtAmt(totals?.totalPaidAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  )
}
