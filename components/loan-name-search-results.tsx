"use client"

import { Loader2 } from "lucide-react"
import type { LoanSearchResult } from "@/types/loan-search"

function fmtCurrency(n: number | null) {
  if (n == null) return "—"
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

interface Props {
  results: LoanSearchResult[]
  loading: boolean
  error: string | null
  hint: string | null
  capped: boolean
  onSelect: (loan: LoanSearchResult) => void
}

// Rendered inside an absolutely-positioned dropdown panel (see LoanSearchForm) — this component only
// supplies the panel's content, not its border/shadow/positioning.
export function LoanNameSearchResults({ results, loading, error, hint, capped, onSelect }: Props) {
  if (hint) {
    return (
      <p className="text-sm text-muted-foreground px-3 py-2.5" aria-live="polite">
        {hint}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching...
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive px-3 py-2.5" aria-live="polite">
        {error}
      </p>
    )
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-3 py-2.5" aria-live="polite">
        No matching loans.
      </p>
    )
  }

  return (
    <div role="list" aria-live="polite">
      {results.map((loan) => (
        <button
          key={`${loan.bankCode}-${loan.loanType}-${loan.loanCode}`}
          type="button"
          role="listitem"
          // onMouseDown (not onClick) so the selection registers before the input's onBlur closes the dropdown.
          onMouseDown={(e) => { e.preventDefault(); onSelect(loan) }}
          className="w-full min-h-11 flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{loan.loanName ?? "—"}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {loan.loanType} / {loan.loanCode}
            </p>
            {(loan.nic || loan.address) && (
              <p className="text-xs text-muted-foreground truncate">
                {[loan.nic, loan.address].filter(Boolean).join(" — ")}
              </p>
            )}
          </div>
          <p className="text-sm font-mono font-semibold shrink-0">{fmtCurrency(loan.balance)}</p>
        </button>
      ))}
      {capped && (
        <p className="text-xs text-muted-foreground px-3 py-2 border-t">
          Showing first 50 — type more to narrow down.
        </p>
      )}
    </div>
  )
}
