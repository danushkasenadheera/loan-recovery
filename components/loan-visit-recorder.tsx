"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Navigation } from "lucide-react"
import { SignaturePad, type SignaturePadRef } from "@/components/signature-pad"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PROXIMITY_THRESHOLD = 25  // target metres
const GPS_ACCURACY_CAP = 30     // cap accuracy contribution so poor-signal devices can't unlock from 200m away

interface LoanVisitRecorderProps {
  loanLocation: { lat: number; lng: number } | null
  loan: { bankCode: string; loanType: string; loanCode: string }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const todayStr = () => new Date().toISOString().split("T")[0]

// Best-effort fresh GPS read at the moment of Save, so the stored position reflects when the visit was
// actually recorded rather than when the form was opened. Falls back to null on timeout/error/no API —
// callers fall back to the position captured at form-open.
function getFreshPosition(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}

export function LoanVisitRecorder({ loanLocation, loan }: LoanVisitRecorderProps) {
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [capturedLat, setCapturedLat] = useState<number | null>(null)
  const [capturedLng, setCapturedLng] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [gpsError, setGpsError] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isOverride, setIsOverride] = useState(false)
  const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false)

  // Form state
  const [obtainerStatement, setObtainerStatement] = useState("")
  const [partPaymentMade, setPartPaymentMade] = useState(false)
  const [partPaymentDate, setPartPaymentDate] = useState(todayStr())
  const [partPaymentAmount, setPartPaymentAmount] = useState("")
  const [officerInstructions, setOfficerInstructions] = useState("")

  const obtainerSigRef = useRef<SignaturePadRef>(null)
  const officerSigRef = useRef<SignaturePadRef>(null)

  // Watch GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError(true); return }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setAccuracy(pos.coords.accuracy)
        setGpsError(false)
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Recalculate distance when user location changes
  useEffect(() => {
    if (!loanLocation || userLat == null || userLng == null) {
      setDistance(null)
      return
    }
    setDistance(haversine(userLat, userLng, loanLocation.lat, loanLocation.lng))
  }, [userLat, userLng, loanLocation])

  const hasLocation = loanLocation != null
  const isWithinRange = distance != null && (
    distance - Math.min(accuracy ?? 0, GPS_ACCURACY_CAP) <= PROXIMITY_THRESHOLD
  )

  const resetForm = useCallback(() => {
    setObtainerStatement("")
    setPartPaymentMade(false)
    setPartPaymentDate(todayStr())
    setPartPaymentAmount("")
    setOfficerInstructions("")
    setError("")
    setIsOverride(false)
    obtainerSigRef.current?.clear()
    officerSigRef.current?.clear()
  }, [])

  const handleOpen = (override: boolean) => {
    resetForm()
    setIsOverride(override)
    setCapturedLat(userLat)
    setCapturedLng(userLng)
    setFormOpen(true)
  }

  const handleOverrideConfirm = () => {
    setOverrideConfirmOpen(false)
    handleOpen(true)
  }

  const handleSubmit = async () => {
    const obtainerSig = obtainerSigRef.current?.getSignature()
    const officerSig = officerSigRef.current?.getSignature()

    if (!obtainerStatement.trim()) { setError("Loan obtainer statement is required."); return }
    if (!obtainerSig) { setError("Loan obtainer signature is required."); return }
    if (!officerInstructions.trim()) { setError("Officer instructions are required."); return }
    if (!officerSig) { setError("Officer signature is required."); return }
    if (partPaymentMade && (!partPaymentAmount || Number(partPaymentAmount) <= 0)) {
      setError("Part payment amount is required when a payment is made.")
      return
    }
    if (capturedLat == null || capturedLng == null) { setError("GPS location could not be captured. Please try again."); return }

    setSubmitting(true)
    setError("")
    try {
      // Re-read position at the moment of Save so the stored coordinates reflect now, not when the form
      // opened; fall back to the position captured at open if the fresh read fails or times out.
      const fresh = await getFreshPosition(2000)
      const finalLat = fresh?.lat ?? capturedLat
      const finalLng = fresh?.lng ?? capturedLng

      const res = await fetch("/api/loan-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: loan.bankCode,
          loanType: loan.loanType,
          loanCode: loan.loanCode,
          visitLat: finalLat,
          visitLang: finalLng,
          obtainerStatement: obtainerStatement.trim(),
          obtainerSignature: obtainerSig,
          partPaymentMade,
          partPaymentDate: partPaymentMade ? partPaymentDate : null,
          partPaymentAmount: partPaymentMade ? Number(partPaymentAmount) : null,
          officerInstructions: officerInstructions.trim(),
          officerSignature: officerSig,
          outOfRangeOverride: isOverride,
        }),
      })
      if (!res.ok) { setError("Failed to record visit. Please try again."); return }
      setFormOpen(false)
      window.location.reload()
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setSubmitting(false)
    }
  }

  const isDisabled = !hasLocation || gpsError || distance == null || !isWithinRange
  const hasGpsPosition = !gpsError && userLat != null && userLng != null
  const showOverride = isDisabled

  const distanceBadgeColor = !hasLocation || gpsError
    ? "border-muted-foreground/40 text-muted-foreground"
    : isWithinRange
    ? "border-green-500 text-green-700"
    : distance != null && distance < 100
    ? "border-amber-500 text-amber-700"
    : "border-muted-foreground/40 text-muted-foreground"

  const distanceLabel = !hasLocation
    ? "No location tagged"
    : gpsError
    ? "GPS unavailable"
    : distance == null
    ? "Getting location…"
    : `${Math.round(distance)}m away${accuracy != null ? ` · ±${Math.round(accuracy)}m` : ""}`

  return (
    <>
      <div className="flex justify-center py-1">
        <Badge variant="outline" className={cn("text-xs gap-1.5 font-normal", distanceBadgeColor)}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            isWithinRange ? "bg-green-500" : distance != null && distance < 100 ? "bg-amber-500" : "bg-muted-foreground/50"
          )} />
          {distanceLabel}
        </Badge>
      </div>

      <Button
        size="lg"
        onClick={() => handleOpen(false)}
        disabled={isDisabled}
        className="w-full gap-2 h-11 font-semibold tracking-wide bg-yellow-500 hover:bg-yellow-400 text-black border-0 disabled:opacity-60"
      >
        <Navigation className="h-4 w-4" />
        RECORD VISIT
      </Button>

      {showOverride && (
        <div className="mt-2 space-y-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOverrideConfirmOpen(true)}
            disabled={!hasGpsPosition}
            className="w-full gap-2 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
          >
            Record Visit Outside Range
          </Button>
          {!hasGpsPosition && (
            <p className="text-xs text-muted-foreground text-center">GPS location required</p>
          )}
        </div>
      )}

      <Dialog open={overrideConfirmOpen} onOpenChange={setOverrideConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-secondary text-base">Record Outside Range?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This visit will be marked as recorded outside the range.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setOverrideConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOverrideConfirm} className="bg-amber-600 hover:bg-amber-700">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-secondary text-base">Record Visit</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-5">
            {isOverride && (
              <Alert className="border-amber-500 text-amber-800 bg-amber-50">
                <AlertDescription className="text-xs">
                  This visit will be marked as recorded outside the range.
                </AlertDescription>
              </Alert>
            )}

            {/* Loan Obtainer */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loan Obtainer</p>
              <div className="space-y-1.5">
                <Label htmlFor="obtainer-statement" className="text-sm">Statement <span className="text-destructive">*</span></Label>
                <Textarea
                  id="obtainer-statement"
                  value={obtainerStatement}
                  onChange={e => setObtainerStatement(e.target.value)}
                  placeholder="Statement from the loan holder…"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Signature <span className="text-destructive">*</span></Label>
                <SignaturePad ref={obtainerSigRef} className="h-36 w-full" />
              </div>
            </div>

            {/* Part Payment */}
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Part Payment</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="part-payment"
                  checked={partPaymentMade}
                  onCheckedChange={(v) => setPartPaymentMade(!!v)}
                />
                <Label htmlFor="part-payment" className="text-sm cursor-pointer">Part payment made</Label>
              </div>
              {partPaymentMade && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pmt-date" className="text-sm">Date</Label>
                    <Input
                      id="pmt-date"
                      type="date"
                      value={partPaymentDate}
                      onChange={e => setPartPaymentDate(e.target.value)}
                      max={todayStr()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pmt-amount" className="text-sm">Amount (LKR)</Label>
                    <Input
                      id="pmt-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={partPaymentAmount}
                      onChange={e => setPartPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Officer */}
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loan Officer</p>
              <div className="space-y-1.5">
                <Label htmlFor="officer-instructions" className="text-sm">Statement <span className="text-destructive">*</span></Label>
                <Textarea
                  id="officer-instructions"
                  value={officerInstructions}
                  onChange={e => setOfficerInstructions(e.target.value)}
                  placeholder="Statement from the visiting loan officer…"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Signature <span className="text-destructive">*</span></Label>
                <SignaturePad ref={officerSigRef} className="h-36 w-full" />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
