"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileSearch, Search, Users } from "lucide-react"
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

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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
      if (!res.ok) {
        setError("Failed to load report.")
        return
      }
      const data: EmployeeLoanReport = await res.json()
      setReport(data)
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!selectedEmp && !!selectedLoanType

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Employee searchable dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Employee</label>
            <div className="relative">
              <input
                ref={empInputRef}
                type="text"
                placeholder="Search by name or ID..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                value={selectedEmp && !empDropdownOpen ? `(${selectedEmp.empNo}) ${selectedEmp.empName ?? ""}` : empSearch}
                onFocus={() => {
                  setEmpSearch("")
                  setEmpDropdownOpen(true)
                }}
                onBlur={() => {
                  setTimeout(() => setEmpDropdownOpen(false), 150)
                }}
                onChange={e => setEmpSearch(e.target.value)}
              />
              <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />

              {empDropdownOpen && (
                <div className="absolute z-50 top-full mt-1 w-full max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {empLoading && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
                  )}
                  {!empLoading && employees.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      {empSearch ? "No match" : "No employees found"}
                    </p>
                  )}
                  {employees.map(e => (
                    <button
                      key={e.empNo}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onMouseDown={() => {
                        setSelectedEmp(e)
                        setEmpSearch("")
                        setEmpDropdownOpen(false)
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">({e.empNo})</span>
                      {e.empName ?? e.empNo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loan Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Loan Type</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={selectedLoanType}
              onChange={e => setSelectedLoanType(e.target.value)}
            >
              <option value="">Select loan type...</option>
              {loanTypes.map(t => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGetReport}
            disabled={!canSubmit || loading}
            className="gap-2"
          >
            <FileSearch className="h-4 w-4" />
            {loading ? "Loading..." : "Get Loan Details"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">
            Select an employee and loan type, then click Get Loan Details.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <ReportTable report={report} />
      )}
    </div>
  )
}

function ReportTable({ report }: { report: EmployeeLoanReport }) {
  return (
    <div className="space-y-3">
      {/* Group header */}
      <div className="rounded-lg border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {report.loans.length} loan{report.loans.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      {report.loans.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No loans found for this employee and loan type.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">Loan No</th>
                  <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">Debtor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Loan Amount</th>
                  <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">Date of Issue</th>
                  <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">NIC</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Installments</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Int %</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Inst (Capital)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Inst (Interest)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Loan Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.loans.map((loan, i) => (
                  <LoanRow key={i} loan={loan} />
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold">{fmt(report.totalLoanAmount)}</td>
                  <td colSpan={6} />
                  <td className="px-3 py-2.5 text-right text-xs font-semibold">{fmt(report.totalLoanBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LoanRow({ loan }: { loan: EmployeeLoanItem }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{loan.loanNo}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        {loan.memberId && (
          <span className="font-mono text-muted-foreground mr-1">{loan.memberId} /</span>
        )}
        <span>{loan.memberName ?? "—"}</span>
      </td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{fmt(loan.loanAmount)}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{fmtDate(loan.dateOfIssue)}</td>
      <td className="px-3 py-2.5 text-xs font-mono">{loan.nic ?? "—"}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{loan.noOfInstallments ?? "—"}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{fmt(loan.installmentCapital)}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{fmt(loan.installmentInterest)}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums font-medium">{fmt(loan.loanBalance)}</td>
    </tr>
  )
}
