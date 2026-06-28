"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClipboardList, CheckCheck } from "lucide-react"
import { GuarantorSignatureModal } from "@/components/guarantor-signature-modal"
import { LoanVisitDetailModal } from "@/components/loan-visit-detail-modal"
import type { LoanVisitListItem } from "@/types/loan-visit"

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtCurrency(amount: number | null) {
  if (amount == null) return ""
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

interface LoanVisitListProps {
  initialVisits: LoanVisitListItem[]
  loan: { bankCode: string; loanType: string; loanCode: string }
}

export function LoanVisitList({ initialVisits, loan }: LoanVisitListProps) {
  const [visits, setVisits] = useState<LoanVisitListItem[]>(initialVisits)
  const [sigModal, setSigModal] = useState<{ visitId: number; guarantorNum: 1 | 2 } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleGuarantorSuccess = (visitId: number, guarantorNum: 1 | 2, signedAt: string) => {
    setVisits(prev => prev.map(v => {
      if (v.id !== visitId) return v
      return guarantorNum === 1
        ? { ...v, hasGuarantor1Signature: true, guarantor1SignedAt: signedAt }
        : { ...v, hasGuarantor2Signature: true, guarantor2SignedAt: signedAt }
    }))
  }

  const openDetail = (id: number) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No visits recorded yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {visits.map(v => (
          <div key={v.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{v.userName}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(v.visitedAt)}</p>
              </div>
              {v.partPaymentMade && (
                <Badge variant="outline" className="text-xs border-green-600/50 text-green-700 shrink-0">
                  Pmt {fmtCurrency(v.partPaymentAmount)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {v.hasGuarantor1Signature ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCheck className="h-3 w-3" /> G1 Signed
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => setSigModal({ visitId: v.id, guarantorNum: 1 })}
                >
                  G1 Sign
                </Button>
              )}

              {v.hasGuarantor2Signature ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCheck className="h-3 w-3" /> G2 Signed
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => setSigModal({ visitId: v.id, guarantorNum: 2 })}
                >
                  G2 Sign
                </Button>
              )}

              {v.hasManagerNote && (
                <Badge variant="outline" className="text-xs border-blue-600/50 text-blue-700">
                  Manager Note
                </Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 ml-auto"
                onClick={() => openDetail(v.id)}
              >
                View
              </Button>
            </div>
          </div>
        ))}
      </div>

      {sigModal && (
        <GuarantorSignatureModal
          visitId={sigModal.visitId}
          guarantorNum={sigModal.guarantorNum}
          open={!!sigModal}
          onOpenChange={(open) => { if (!open) setSigModal(null) }}
          onSuccess={handleGuarantorSuccess}
        />
      )}

      <LoanVisitDetailModal
        visitId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
