"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
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

function SectionCard({ title, name, children }: { title: string; name?: string | null; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
      <div className="px-4 py-2.5 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E] flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">{title}</p>
        {name && <p className="text-xs font-semibold text-[#374151] truncate">{name}</p>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function SignatureImage({ src, label }: { src: string; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#6B7280] mb-1.5">{label}</p>
      <img src={src} alt={label} className="border border-[#E5E7EB] rounded-lg bg-white max-h-28 w-full object-contain" />
    </div>
  )
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">{label}</p>
      <p className={cn("text-sm font-semibold text-[#111827] mt-0.5", mono && "font-mono text-xs")}>{value}</p>
    </div>
  )
}

interface Guarantor {
  name: string | null
  mobile: string | null
  address: string | null
}

interface LoanVisitDetailModalProps {
  visitId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantors?: Guarantor[]
}

export function LoanVisitDetailModal({ visitId, open, onOpenChange, guarantors = [] }: LoanVisitDetailModalProps) {
  const [detail, setDetail] = useState<LoanVisitDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || visitId == null) return
    setLoading(true)
    setError("")
    setDetail(null)
    fetch(`/api/loan-visits/${visitId}`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setDetail)
      .catch(() => setError("Failed to load visit details."))
      .finally(() => setLoading(false))
  }, [open, visitId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[rgba(15,23,42,.45)] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-[0_20px_80px_rgba(15,23,42,.3)] flex flex-col my-auto">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-[#E9D9C5]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-primary">Visit Details</p>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
          {detail && (
            <div className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs text-[#6B7280]">
                  <span className="font-medium text-[#374151]">Date </span>{fmtDateTime(detail.visitedAt)}
                </span>
                <span className="text-xs text-[#6B7280]">
                  <span className="font-medium text-[#374151]">Officer </span>{detail.userName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto max-h-[75vh] px-5 py-5 space-y-4">

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

          {detail && (
            <>
              {/* Visit Info */}
              <SectionCard title="Visit Info">
                <div className="grid grid-cols-2 gap-4">
                  <MetaRow label="Date / Time" value={fmtDateTime(detail.visitedAt)} />
                  <MetaRow label="Officer" value={detail.userName} />
                  <div className="col-span-2">
                    <MetaRow label="Officer GPS" value={`${detail.visitLat.toFixed(6)}, ${detail.visitLang.toFixed(6)}`} mono />
                  </div>
                </div>
              </SectionCard>

              {/* Loan Obtainer */}
              <SectionCard title="Loan Obtainer">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[#6B7280] mb-1.5">Statement</p>
                    <p className="text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 leading-relaxed">{detail.obtainerStatement}</p>
                  </div>
                  <SignatureImage src={detail.obtainerSignature} label="Signature" />
                </div>
              </SectionCard>

              {/* Part Payment */}
              {detail.partPaymentMade && (
                <SectionCard title="Part Payment">
                  <div className="grid grid-cols-2 gap-4">
                    <MetaRow label="Amount" value={fmtCurrency(detail.partPaymentAmount)} />
                    <MetaRow label="Date" value={fmt(detail.partPaymentDate)} />
                  </div>
                </SectionCard>
              )}

              {/* Officer Instructions */}
              <SectionCard title="Loan Officer">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[#6B7280] mb-1.5">Statement</p>
                    <p className="text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 leading-relaxed">{detail.officerInstructions}</p>
                  </div>
                  <SignatureImage src={detail.officerSignature} label="Officer Signature" />
                </div>
              </SectionCard>

              {/* Guarantor 1 */}
              {guarantors.length >= 1 && (
                <SectionCard title="Guarantor 1 Signature" name={guarantors[0]?.name}>
                  {detail.guarantor1Signature ? (
                    <div className="space-y-2">
                      <SignatureImage src={detail.guarantor1Signature} label="Signature" />
                      <p className="text-xs text-[#6B7280]">Signed {fmtDateTime(detail.guarantor1SignedAt)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet recorded</p>
                  )}
                </SectionCard>
              )}

              {/* Guarantor 2 */}
              {guarantors.length >= 2 && (
                <SectionCard title="Guarantor 2 Signature" name={guarantors[1]?.name}>
                  {detail.guarantor2Signature ? (
                    <div className="space-y-2">
                      <SignatureImage src={detail.guarantor2Signature} label="Signature" />
                      <p className="text-xs text-[#6B7280]">Signed {fmtDateTime(detail.guarantor2SignedAt)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet recorded</p>
                  )}
                </SectionCard>
              )}

              {/* Manager Note */}
              {detail.managerNote && (
                <SectionCard title="Manager Note">
                  <div className="space-y-3">
                    <p className="text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 leading-relaxed">{detail.managerNote}</p>
                    {detail.managerSignature && (
                      <SignatureImage src={detail.managerSignature} label="Manager Signature" />
                    )}
                    <p className="text-xs text-[#6B7280]">Added {fmtDateTime(detail.managerNoteAt)}</p>
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
