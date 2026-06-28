"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { SignaturePad, type SignaturePadRef } from "@/components/signature-pad"

interface GuarantorSignatureModalProps {
  visitId: number
  guarantorNum: 1 | 2
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (visitId: number, guarantorNum: 1 | 2, signedAt: string) => void
}

export function GuarantorSignatureModal({
  visitId,
  guarantorNum,
  open,
  onOpenChange,
  onSuccess,
}: GuarantorSignatureModalProps) {
  const sigRef = useRef<SignaturePadRef>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    const signature = sigRef.current?.getSignature()
    if (!signature) {
      setError("Please provide a signature before submitting.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/loan-visits/${visitId}/guarantor${guarantorNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      })
      if (res.status === 409) {
        setError("This signature has already been recorded.")
        return
      }
      if (!res.ok) {
        setError("Failed to record signature. Please try again.")
        return
      }
      const updated = await res.json()
      onSuccess(visitId, guarantorNum, guarantorNum === 1 ? updated.guarantor1SignedAt : updated.guarantor2SignedAt)
      onOpenChange(false)
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-secondary text-base">
            Guarantor {guarantorNum} Signature
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Ask guarantor {guarantorNum} to sign in the box below. Once submitted this cannot be changed.
          </p>
          <SignaturePad ref={sigRef} className="h-40 w-full" />
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
