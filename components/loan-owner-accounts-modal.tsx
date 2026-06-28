"use client"

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, History } from "lucide-react"
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

  if (!nic) return null

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleOpen}
        className="w-full gap-2 h-11 font-semibold tracking-wide"
      >
        <Wallet className="h-4 w-4" />
        View Account Details
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-secondary text-base">Account Details</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center py-6">{error}</p>}

          {!loading && !error && accounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No accounts found.</p>
          )}

          {!loading && accounts.length > 0 && (
            <div className="divide-y rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
                <span>Account No</span>
                <span className="text-right pr-4">Balance</span>
                <span />
              </div>
              {accounts.map((acc, i) => {
                const isLinked = blockAccountNo && acc.accNo === blockAccountNo
                return (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto] items-center px-3 py-2.5",
                      isLinked ? "bg-green-50 dark:bg-green-950/30" : "bg-background"
                    )}
                  >
                    <span className={cn("font-mono text-xs", isLinked && "font-semibold text-green-700 dark:text-green-400")}>
                      {acc.accNo ?? "—"}
                    </span>
                    <span className={cn("text-right text-sm pr-4", isLinked && "font-semibold text-green-700 dark:text-green-400")}>
                      {fmtCurrency(acc.balance)}
                    </span>
                    {acc.accNo && (
                      <Link
                        href={`/account-history/${encodeURIComponent(acc.accNo)}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View full history"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
