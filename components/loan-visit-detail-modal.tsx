"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import type { LoanVisitDetail } from "@/types/loan-visit"

function fmt(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtCurrency(amount: number | null) {
  if (amount == null) return "—"
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function SignatureImage({ src, label }: { src: string; label: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <img src={src} alt={label} className="border rounded-lg bg-white max-h-28 w-full object-contain" />
    </div>
  )
}

interface LoanVisitDetailModalProps {
  visitId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoanVisitDetailModal({ visitId, open, onOpenChange }: LoanVisitDetailModalProps) {
  const [detail, setDetail] = useState<LoanVisitDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || visitId == null) return
    setLoading(true)
    setError("")
    fetch(`/api/loan-visits/${visitId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load visit details")
        return res.json()
      })
      .then(setDetail)
      .catch(() => setError("Failed to load visit details."))
      .finally(() => setLoading(false))
  }, [open, visitId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-bold text-base">Visit Details</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center py-8">{error}</p>}

          {detail && (
            <>
              <Section title="Visit Info">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Date / Time</dt>
                    <dd className="font-medium mt-0.5">{fmtDateTime(detail.visitedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Officer</dt>
                    <dd className="font-medium mt-0.5">{detail.userName}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Officer GPS</dt>
                    <dd className="font-mono text-xs mt-0.5 text-muted-foreground">
                      {detail.visitLat.toFixed(6)}, {detail.visitLang.toFixed(6)}
                    </dd>
                  </div>
                </dl>
              </Section>

              <div className="border-t" />

              <Section title="Loan Obtainer">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Statement</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{detail.obtainerStatement}</p>
                  </div>
                  <SignatureImage src={detail.obtainerSignature} label="Signature" />
                </div>
              </Section>

              {detail.partPaymentMade && (
                <>
                  <div className="border-t" />
                  <Section title="Part Payment">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Amount</dt>
                        <dd className="font-medium mt-0.5">{fmtCurrency(detail.partPaymentAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Date</dt>
                        <dd className="font-medium mt-0.5">{fmt(detail.partPaymentDate)}</dd>
                      </div>
                    </dl>
                  </Section>
                </>
              )}

              <div className="border-t" />

              <Section title="Officer Instructions">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{detail.officerInstructions}</p>
                  </div>
                  <SignatureImage src={detail.officerSignature} label="Officer Signature" />
                </div>
              </Section>

              <div className="border-t" />

              <Section title="Guarantor 1 Signature">
                {detail.guarantor1Signature ? (
                  <div className="space-y-1">
                    <SignatureImage src={detail.guarantor1Signature} label="Signature" />
                    <p className="text-xs text-muted-foreground">Signed: {fmtDateTime(detail.guarantor1SignedAt)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet recorded</p>
                )}
              </Section>

              <div className="border-t" />

              <Section title="Guarantor 2 Signature">
                {detail.guarantor2Signature ? (
                  <div className="space-y-1">
                    <SignatureImage src={detail.guarantor2Signature} label="Signature" />
                    <p className="text-xs text-muted-foreground">Signed: {fmtDateTime(detail.guarantor2SignedAt)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet recorded</p>
                )}
              </Section>

              {detail.managerNote && (
                <>
                  <div className="border-t" />
                  <Section title="Manager Note">
                    <div className="space-y-3">
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{detail.managerNote}</p>
                      {detail.managerSignature && (
                        <SignatureImage src={detail.managerSignature} label="Manager Signature" />
                      )}
                      <p className="text-xs text-muted-foreground">Added: {fmtDateTime(detail.managerNoteAt)}</p>
                    </div>
                  </Section>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
