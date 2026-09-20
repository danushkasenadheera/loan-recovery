"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, History, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LoanOwnerAccount } from "@/types/loan-visit"

function fmtCurrency(amount: number | null) {
  if (amount == null) return "—"
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

interface LoanOwnerAccountsModalProps {
  nic: string | null
  blockAccountNo: string | null
}

export function LoanOwnerAccountsModal({ nic, blockAccountNo }: LoanOwnerAccountsModalProps) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<LoanOwnerAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleOpen = async () => {
    setOpen(true)
    if (accounts.length > 0) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/loan-owner-accounts?NIC=${encodeURIComponent(nic!)}`)
      if (!res.ok) throw new Error()
      setAccounts(await res.json())
    } catch {
      setError("Failed to load account details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!nic) return null

  return (
    <>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleOpen}>
        <Wallet className="h-4 w-4" />
        View Account Details
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[rgba(15,23,42,.45)] overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-[0_20px_80px_rgba(15,23,42,.3)] flex flex-col my-auto">

            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-[#E9D9C5]">
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-bold text-primary">Account Details</p>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto max-h-[70vh]">
              {loading && (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 h-40 justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              )}

              {!loading && !error && accounts.length === 0 && (
                <div className="flex items-center justify-center h-40">
                  <p className="text-sm text-muted-foreground">No accounts found.</p>
                </div>
              )}

              {!loading && !error && accounts.length > 0 && (
                <div className="px-5 py-5">
                  <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                    <div className="px-5 py-3 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                      <p className="text-sm font-bold text-primary">
                        Owner Accounts
                        <span className="ml-2 text-xs font-normal text-muted-foreground">({accounts.length})</span>
                      </p>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FAF6F2] sticky top-0 z-10">
                          <th className="text-left px-4 py-3 font-semibold text-[#374151] border-b border-[#E9D9C5]">Account No</th>
                          <th className="text-right px-4 py-3 font-semibold text-[#374151] border-b border-[#E9D9C5]">Balance</th>
                          <th className="px-4 py-3 border-b border-[#E9D9C5] w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((acc, i) => {
                          const isLinked = blockAccountNo != null && acc.accNo === blockAccountNo
                          return (
                            <tr
                              key={i}
                              className={cn(
                                "hover:bg-[#FFF8E8] transition-colors",
                                isLinked ? "bg-[#F0FDF4]" : i % 2 !== 0 ? "bg-[#FCFCFC]" : "bg-white"
                              )}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-mono", isLinked ? "font-semibold text-green-700" : "text-[#111827]")}>
                                    {acc.accNo ?? "—"}
                                  </span>
                                  {isLinked && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">
                                      Linked
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={cn("px-4 py-3 text-right font-mono font-semibold", isLinked ? "text-green-700" : "text-[#111827]")}>
                                {fmtCurrency(acc.balance)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {acc.accNo && (
                                  <Link
                                    href={`/account-history/${encodeURIComponent(acc.accNo)}`}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="View history"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </Link>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
