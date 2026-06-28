"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileSearch, Search, Users, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmployeeOption, EmployeeLoanReport, EmployeeLoanItem } from "@/types/employee-loan-report"

interface LoanTypeOption {
  code: string
  description: string
}

interface Props {
  loanTypes: LoanTypeOption[]
  bankCode: string
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShort(n: number | null | undefined) {
  if (n == null) return "—"
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(0)}K`
  return `Rs. ${Math.round(n).toLocaleString()}`
}

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function InterestBadge({ rate }: { rate: number | null | undefined }) {
  if (rate == null) return <span className="text-xs text-[#6B7280]">—</span>
  const tier = rate < 20 ? "low" : rate <= 27 ? "mid" : "high"
  const styles = {
    low: "bg-[#F3F4F6] text-[#374151]",
    mid: "bg-[#FEF3C7] text-[#92400E]",
    high: "bg-[#F0DCDD] text-[#5B1218]",
  }
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums", styles[tier])}>
      {rate}%
    </span>
  )
}

export function EmployeeLoanFilter({ loanTypes, bankCode }: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeOption | null>(null)
  const [selectedLoanType, setSelectedLoanType] = useState("")
  const [empLoading, setEmpLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<EmployeeLoanReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const empInputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!empDropdownOpen) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchEmployees(empSearch), 300)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [empSearch, empDropdownOpen])

  async function fetchEmployees(search: string) {
    setEmpLoading(true)
    try {
      const params = new URLSearchParams({ BankCode: bankCode })
      if (search.trim()) params.set("Search", search.trim())
      const res = await fetch(`/api/employees?${params}`)
      if (res.ok) setEmployees(await res.json())
    } finally {
      setEmpLoading(false)
    }
  }

  async function handleGetReport() {
    if (!selectedEmp || !selectedLoanType) return
    setLoading(true)
    setReport(null)
    setError(null)
    try {
      const params = new URLSearchParams({
        BankCode: bankCode,
        EmpNo: selectedEmp.empNo,
        LoanType: selectedLoanType,
      })
      const res = await fetch(`/api/report/employee-loans?${params}`)
      if (!res.ok) { setError("Failed to load report."); return }
      setReport(await res.json())
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!selectedEmp && !!selectedLoanType

  return (
    <div className="space-y-6">

      {/* Single-row filter toolbar */}
      <div className="bg-muted/40 border border-[#E5E7EB] rounded-xl px-4 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Employee searchable dropdown */}
          <div className="relative flex-1 min-w-0">
            <input
              ref={empInputRef}
              type="text"
              placeholder="Search employee..."
              className="w-full h-9 rounded-lg border border-input bg-white px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              value={selectedEmp && !empDropdownOpen ? `(${selectedEmp.empNo}) ${selectedEmp.empName ?? ""}` : empSearch}
              onFocus={() => { setEmpSearch(""); setEmpDropdownOpen(true) }}
              onBlur={() => { setTimeout(() => setEmpDropdownOpen(false), 150) }}
              onChange={e => setEmpSearch(e.target.value)}
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            {empDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                {empLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>}
                {!empLoading && employees.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">{empSearch ? "No match" : "No employees found"}</p>
                )}
                {employees.map(e => (
                  <button
                    key={e.empNo}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors"
                    onMouseDown={() => { setSelectedEmp(e); setEmpSearch(""); setEmpDropdownOpen(false) }}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">({e.empNo})</span>
                    {e.empName ?? e.empNo}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loan type */}
          <select
            className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors sm:w-56"
            value={selectedLoanType}
            onChange={e => setSelectedLoanType(e.target.value)}
          >
            <option value="">Loan type...</option>
            {loanTypes.map(t => (
              <option key={t.code} value={t.code}>{t.code} — {t.description}</option>
            ))}
          </select>

          <Button onClick={handleGetReport} disabled={!canSubmit || loading} className="gap-2 shrink-0">
            <FileSearch className="h-4 w-4" />
            {loading ? "Loading..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Users className="h-10 w-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">Select an employee and loan type, then generate the report.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Report */}
      {report && <ReportSection report={report} bankCode={bankCode} />}
    </div>
  )
}

function ReportSection({ report, bankCode }: { report: EmployeeLoanReport; bankCode: string }) {
  const loanCount = report.loans.length
  const avgAmount = loanCount > 0 ? (report.totalLoanAmount ?? 0) / loanCount : 0

  return (
    <div className="space-y-4">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Loans" value={String(loanCount)} />
        <KpiCard label="Loan Value" value={fmtShort(report.totalLoanAmount)} />
        <KpiCard label="Avg Amount" value={fmtShort(avgAmount)} />
        <KpiCard label="Outstanding" value={fmtShort(report.totalLoanBalance)} highlight />
      </div>

      {/* Table section */}
      {loanCount === 0 ? (
        <div className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-12 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-muted-foreground">No loans found for this employee and loan type.</p>
        </div>
      ) : (
        <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          {/* Table label */}
          <div className="px-5 py-3 border-b border-[#E9D9C5] bg-[#FAF6F2] border-l-4 border-l-[#C99A2E] flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary">{loanCount}</span>
            <span className="text-sm font-medium text-[#6B7280]">Loan{loanCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
            <table className="w-full text-sm min-w-[960px] border-collapse">
              <thead>
                <tr className="bg-[#FAF6F2] sticky top-0 z-20">
                  <th className="sticky left-0 z-30 bg-[#FAF6F2] px-4 py-3 text-left text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5] shadow-[2px_0_4px_rgba(0,0,0,0.04)]">Loan No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Debtor</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Loan Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Date of Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">NIC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Installments</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Int %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Inst Capital</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Inst Interest</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#374151] whitespace-nowrap border-b border-[#E9D9C5]">Action</th>
                </tr>
              </thead>
              <tbody>
                {report.loans.map((loan, i) => (
                  <LoanRow
                    key={i}
                    loan={loan}
                    isEven={i % 2 !== 0}
                    bankCode={bankCode}
                    loanType={report.loanType}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAF6F2] border-t-2 border-[#E9D9C5]">
                  <td className="sticky left-0 bg-[#FAF6F2] px-4 py-3 text-xs font-bold text-[#374151] shadow-[2px_0_4px_rgba(0,0,0,0.04)]" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-[#111827] tabular-nums">{fmt(report.totalLoanAmount)}</td>
                  <td colSpan={6} />
                  <td className="px-4 py-3 text-right text-xs font-bold text-[#111827] tabular-nums">{fmt(report.totalLoanBalance)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-card border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <p className="text-xs text-[#6B7280] font-medium">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5 tabular-nums", highlight ? "text-primary" : "text-[#111827]")}>{value}</p>
    </div>
  )
}

function LoanRow({ loan, isEven, bankCode, loanType }: {
  loan: EmployeeLoanItem
  isEven: boolean
  bankCode: string
  loanType: string
}) {
  const rowBg = isEven ? "bg-[#FCFCFC]" : "bg-white"
  const loanCode = loan.loanNo.split("/")[1] ?? loan.loanNo
  const loanHref = `/dashboard?BankCode=${bankCode}&LoanType=${loanType}&LoanCode=${loanCode}`

  return (
    <tr className={cn("group cursor-pointer hover:bg-[#FFF8E8] transition-colors", rowBg)}>
      <td className={cn(
        "sticky left-0 z-10 px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap",
        "shadow-[2px_0_4px_rgba(0,0,0,0.04)] group-hover:bg-[#FFF8E8]",
        rowBg
      )}>
        {loan.loanNo}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap">
        {loan.memberId && (
          <span className="font-mono text-[#9CA3AF] mr-1.5">{loan.memberId}</span>
        )}
        <span className="font-medium text-[#111827]">{loan.memberName ?? "—"}</span>
      </td>
      <td className="px-4 py-3 text-right text-xs tabular-nums font-medium text-[#111827]">{fmt(loan.loanAmount)}</td>
      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(loan.dateOfIssue)}</td>
      <td className="px-4 py-3 text-xs font-mono text-[#6B7280]">{loan.nic ?? "—"}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-[#374151]">{loan.noOfInstallments ?? "—"}</td>
      <td className="px-4 py-3 text-center">
        <InterestBadge rate={loan.interestRate} />
      </td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-[#374151]">{fmt(loan.installmentCapital)}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-[#374151]">{fmt(loan.installmentInterest)}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums font-semibold text-[#111827]">{fmt(loan.loanBalance)}</td>
      <td className="px-4 py-3 text-center">
        <Link
          href={loanHref}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-[#470D13] transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </Link>
      </td>
    </tr>
  )
}
