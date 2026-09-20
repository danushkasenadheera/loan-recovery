"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, X, Phone, MapPin, AlertCircle } from "lucide-react"
import { SignaturePad, type SignaturePadRef } from "@/components/signature-pad"

interface GuarantorSignatureModalProps {
  visitId: number
  guarantorNum: 1 | 2
  guarantor?: { name: string | null; mobile: string | null; address: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (visitId: number, guarantorNum: 1 | 2, signedAt: string) => void
}

export function GuarantorSignatureModal({
  visitId,
  guarantorNum,
  guarantor,
  open,
  onOpenChange,
  onSuccess,
}: GuarantorSignatureModalProps) {
  const sigRef = useRef<SignaturePadRef>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const handleSubmit = async () => {
    const signature = sigRef.current?.getSignature()
    if (!signature) { setError("Please provide a signature before submitting."); return }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/loan-visits/${visitId}/guarantor${guarantorNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      })
      if (res.status === 409) { setError("This signature has already been recorded."); return }
      if (!res.ok) { setError("Failed to record signature. Please try again."); return }
      const updated = await res.json()
      onSuccess(visitId, guarantorNum, guarantorNum === 1 ? updated.guarantor1SignedAt : updated.guarantor2SignedAt)
      onOpenChange(false)
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[rgba(15,23,42,.45)] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-[0_20px_80px_rgba(15,23,42,.3)] flex flex-col my-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-[#E9D9C5] flex items-center justify-between px-5 py-4">
          <p className="text-sm font-bold text-primary">Guarantor {guarantorNum} Signature</p>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} disabled={submitting} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Guarantor details */}
          {guarantor && (
            <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
              <div className="px-4 py-2.5 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Guarantor {guarantorNum}</p>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {guarantor.name && (
                  <p className="text-sm font-semibold text-[#111827]">{guarantor.name}</p>
                )}
                {guarantor.mobile && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-[#9CA3AF] shrink-0" />
                    <a href={`tel:${guarantor.mobile}`} className="text-xs text-blue-600 hover:underline">{guarantor.mobile}</a>
                  </div>
                )}
                {guarantor.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 text-[#9CA3AF] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#6B7280] leading-snug">{guarantor.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instruction */}
          <div className="bg-[#FFFBEB] border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-[#92400E]">
              Ask guarantor {guarantorNum} to sign in the box below. Once submitted this cannot be changed.
            </p>
          </div>

          {/* Signature */}
          <div className="bg-card border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-[#FAF6F2] border-b border-[#E9D9C5] border-l-4 border-l-[#C99A2E]">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Signature</p>
            </div>
            <div className="p-4">
              <SignaturePad ref={sigRef} className="h-40 w-full" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-[#FEF2F2] px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card rounded-b-2xl border-t border-[#E9D9C5] px-5 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[130px]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Signature"}
          </Button>
        </div>

      </div>
    </div>
  )
}
