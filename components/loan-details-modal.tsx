"use client"

import { useState, useEffect } from "react"
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LoanDetailReport } from "@/types/loan-visit"

interface LoanDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: { bankCode: string; loanType: string; loanCode: string; referenceNo: string; loanName?: string | null }
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
    const params = new URLSearchParams({ BankCode: loan.bankCode, LoanType: loan.loanType, LoanCode: loan.loanCode })
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
  const isSettled = (summary?.totalOutstanding ?? 1) === 0

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[rgba(15,23,42,.45)] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      {/* Dialog */}
      <div className="relative w-full max-w-5xl bg-card rounded-2xl shadow-[0_20px_80px_rgba(15,23,42,.3)] flex flex-col my-auto">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-[#E9D9C5]">

          {/* Row 1: title + status + close */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-primary">Loan Details</p>
              {summary && (
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                  isSettled ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"
                )}>
                  {isSettled ? "● Settled" : "● Outstanding"}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Row 2: customer + reference meta */}
          <div className="px-5 py-3">
            {loan.loanName && (
              <p className="text-base font-bold text-[#111827] leading-none">{loan.loanName}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-xs font-mono text-[#6B7280]">{loan.referenceNo}</span>
              <span className="text-[10px] text-[#9CA3AF]">·</span>
              <span className="text-xs text-[#6B7280]">
                <span className="font-medium text-[#374151]">Branch </span>{loan.bankCode}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">·</span>
              <span className="text-xs text-[#6B7280]">
                <span className="font-medium text-[#374151]">Type </span>{loan.loanType}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center gap-2 h-64">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Failed to load loan details.</p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">

              {/* ── Hero Outstanding Balance ── */}
              <div className={cn(
                "rounded-xl border px-6 py-5",
                isSettled
                  ? "bg-[#F0FDF4] border-green-200"
                  : "bg-[#FFFBEB] border-amber-200"
              )}>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Outstanding Balance</p>
                <p className={cn(
                  "text-4xl font-bold tabular-nums mt-2 font-mono",
                  isSettled ? "text-green-700" : "text-red-600"
                )}>
                  Rs. {fmtAmt(summary?.totalOutstanding)}
                </p>
                {isSettled ? (
                  <div className="flex items-center gap-2 mt-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm font-medium text-green-700">Fully Settled — No outstanding payments</p>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    <p className="text-xs text-[#6B7280]">
                      Principal balance: <span className="font-semibold text-[#374151]">Rs. {fmtAmt(summary?.remainingPrincipalBalance)}</span>
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Interest due: <span className="font-semibold text-[#374151]">Rs. {fmtAmt(summary?.interestToBePaidUptoToday)}</span>
                    </p>
                    {(summary?.penaltyInterestToBePaidUptoToday ?? 0) > 0 && (
                      <p className="text-xs text-red-600 font-semibold">
                        Penalty: Rs. {fmtAmt(summary?.penaltyInterestToBePaidUptoToday)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── KPI strip ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Opening Loan",       value: `Rs. ${fmtAmt(summary?.openingPrincipal)}`,           bar: "bg-primary" },
                  { label: "Installments Paid",  value: summary?.noOfInstallmentsPaid?.toString() ?? "—",     bar: "bg-blue-400" },
                  { label: "Principal Paid",      value: `Rs. ${fmtAmt(summary?.principalPaid)}`,              bar: "bg-green-500" },
                  { label: "Interest Paid",       value: `Rs. ${fmtAmt(summary?.interestPaid)}`,               bar: "bg-blue-400" },
                  { label: "Penalty Paid",        value: `Rs. ${fmtAmt(summary?.penaltyPaid)}`,                bar: (summary?.penaltyPaid ?? 0) > 0 ? "bg-red-500" : "bg-[#E5E7EB]" },
                  { label: "Loan Balance",        value: `Rs. ${fmtAmt(summary?.remainingPrincipalBalance)}`,  bar: isSettled ? "bg-green-500" : "bg-primary" },
                ].map(({ label, value, bar }) => (
                  <div key={label} className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                    <div className={cn("h-0.5 w-8 rounded-full mb-2", bar)} />
                    <p className="text-[10px] font-medium text-[#6B7280] leading-snug">{label}</p>
                    <p className="text-sm font-bold text-[#111827] tabular-nums mt-0.5 font-mono">{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Payment History ── */}
              <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                <div className="px-5 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                  <p className="text-sm font-bold text-primary">Payment History
                    {history.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({history.length} transactions)</span>}
                  </p>
                </div>
                {history.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-muted-foreground">No payment history found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs min-w-[560px] border-collapse">
                      <thead>
                        <tr className="bg-[#FAF6F2] sticky top-0 z-10">
                          <th className="text-left px-4 py-3 font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Date</th>
                          <th className="text-left px-4 py-3 font-semibold text-[#374151] border-b border-[#E9D9C5]">Remarks</th>
                          <th className="text-right px-4 py-3 font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Principal</th>
                          <th className="text-right px-4 py-3 font-semibold text-blue-600 whitespace-nowrap border-b border-[#E9D9C5]">Interest</th>
                          <th className="text-right px-4 py-3 font-semibold text-red-500 whitespace-nowrap border-b border-[#E9D9C5]">Penalty</th>
                          <th className="text-right px-4 py-3 font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "hover:bg-[#FFF8E8] transition-colors cursor-default",
                              i % 2 !== 0 ? "bg-[#FCFCFC]" : "bg-white"
                            )}
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap text-[#6B7280]">{fmtDate(entry.date)}</td>
                            <td className="px-4 py-2.5 text-[#374151] max-w-[180px] truncate">{entry.remarks || "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-[#111827]">{entry.principal > 0 ? fmtAmt(entry.principal) : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-600">{entry.interest > 0 ? fmtAmt(entry.interest) : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-red-500">{entry.penalty > 0 ? fmtAmt(entry.penalty) : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#111827]">{fmtAmt(entry.runningPrincipalBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#FAF6F2] border-t-2 border-[#E9D9C5]">
                          <td className="px-4 py-3 font-bold text-[#374151]" colSpan={2}>TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#111827]">{fmtAmt(totals?.totalPrincipal)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{fmtAmt(totals?.totalInterest)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-red-500">{fmtAmt(totals?.totalPenalty)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#111827]">{fmtAmt(totals?.loanBalance)}</td>
                        </tr>
                        <tr className="bg-[#FAF6F2] border-t border-[#E9D9C5]">
                          <td className="px-4 py-2 text-[#6B7280]" colSpan={2}>Total Paid (Principal + Interest + Penalty)</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-primary" colSpan={4}>
                            LKR {fmtAmt(totals?.totalPaidAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
