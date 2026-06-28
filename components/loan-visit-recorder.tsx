"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Navigation, MapPin } from "lucide-react"
import { SignaturePad, type SignaturePadRef } from "@/components/signature-pad"
import { cn } from "@/lib/utils"

const PROXIMITY_THRESHOLD = 25
const GPS_ACCURACY_CAP = 30

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

  // Form state
  const [obtainerStatement, setObtainerStatement] = useState("")
  const [partPaymentMade, setPartPaymentMade] = useState(false)
  const [partPaymentDate, setPartPaymentDate] = useState(todayStr())
  const [partPaymentAmount, setPartPaymentAmount] = useState("")
  const [officerInstructions, setOfficerInstructions] = useState("")

  const obtainerSigRef = useRef<SignaturePadRef>(null)
  const officerSigRef = useRef<SignaturePadRef>(null)

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

  useEffect(() => {
    if (!loanLocation || userLat == null || userLng == null) { setDistance(null); return }
    setDistance(haversine(userLat, userLng, loanLocation.lat, loanLocation.lng))
  }, [userLat, userLng, loanLocation])

  const hasLocation = loanLocation != null
  const isWithinRange = distance != null && (distance - Math.min(accuracy ?? 0, GPS_ACCURACY_CAP) <= PROXIMITY_THRESHOLD)

  const resetForm = useCallback(() => {
    setObtainerStatement("")
    setPartPaymentMade(false)
    setPartPaymentDate(todayStr())
    setPartPaymentAmount("")
    setOfficerInstructions("")
    setError("")
    obtainerSigRef.current?.clear()
    officerSigRef.current?.clear()
  }, [])

  const handleOpen = () => {
    resetForm()
    setCapturedLat(userLat)
    setCapturedLng(userLng)
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    const obtainerSig = obtainerSigRef.current?.getSignature()
    const officerSig = officerSigRef.current?.getSignature()
    if (!obtainerStatement.trim()) { setError("Loan obtainer statement is required."); return }
    if (!obtainerSig) { setError("Loan obtainer signature is required."); return }
    if (!officerInstructions.trim()) { setError("Officer instructions are required."); return }
    if (!officerSig) { setError("Officer signature is required."); return }
    if (partPaymentMade && (!partPaymentAmount || Number(partPaymentAmount) <= 0)) {
      setError("Part payment amount is required when a payment is made."); return
    }
    if (capturedLat == null || capturedLng == null) { setError("GPS location could not be captured. Please try again."); return }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/loan-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: loan.bankCode,
          loanType: loan.loanType,
          loanCode: loan.loanCode,
          visitLat: capturedLat,
          visitLang: capturedLng,
          obtainerStatement: obtainerStatement.trim(),
          obtainerSignature: obtainerSig,
          partPaymentMade,
          partPaymentDate: partPaymentMade ? partPaymentDate : null,
          partPaymentAmount: partPaymentMade ? Number(partPaymentAmount) : null,
          officerInstructions: officerInstructions.trim(),
          officerSignature: officerSig,
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

  // GPS card state
  const gpsIndicator = !hasLocation || gpsError
    ? "bg-[#D1D5DB]"
    : distance == null
    ? "bg-amber-400 animate-pulse"
    : isWithinRange
    ? "bg-green-500"
    : "bg-amber-500"

  const gpsStatusBg = !hasLocation ? "bg-[#F9FAFB]"
    : gpsError ? "bg-[#FEF2F2]"
    : distance == null ? "bg-[#F9FAFB]"
    : isWithinRange ? "bg-[#F0FDF4]"
    : "bg-[#FFFBEB]"

  const gpsStatusDot = !hasLocation || gpsError ? "bg-[#9CA3AF]"
    : distance == null ? "bg-amber-400"
    : isWithinRange ? "bg-green-500"
    : "bg-amber-500"

  const gpsStatusText = !hasLocation || gpsError ? "text-[#6B7280]"
    : distance == null ? "text-[#6B7280]"
    : isWithinRange ? "text-green-700"
    : "text-amber-700"

  const gpsStatusLabel = !hasLocation ? "Location not tagged"
    : gpsError ? "GPS unavailable — enable location services"
    : distance == null ? "Acquiring GPS signal…"
    : isWithinRange ? `Ready to Record — within ${PROXIMITY_THRESHOLD}m`
    : `${Math.round(distance)}m away — move closer to record`

  return (
    <>
      {/* GPS Status Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F3F4F6]">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-[#9CA3AF]" />
            GPS Status
          </p>
          <span className={cn("h-2 w-2 rounded-full", gpsIndicator)} />
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {hasLocation && !gpsError && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Distance</p>
                <p className="text-2xl font-bold font-mono text-[#111827] leading-tight">
                  {distance != null ? `${Math.round(distance)}m` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide">Accuracy</p>
                <p className="text-2xl font-bold font-mono text-[#111827] leading-tight">
                  {accuracy != null ? `±${Math.round(accuracy)}m` : "—"}
                </p>
              </div>
            </div>
          )}
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", gpsStatusBg)}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", gpsStatusDot)} />
            <p className={cn("text-xs font-semibold", gpsStatusText)}>{gpsStatusLabel}</p>
          </div>
        </div>
      </div>

      {/* RECORD VISIT */}
      <Button
        size="lg"
        onClick={handleOpen}
        disabled={isDisabled}
        className="w-full gap-2 h-12 font-bold tracking-widest bg-[#C99A2E] hover:bg-[#B08926] active:bg-[#9A7820] text-white border-0 disabled:opacity-50 text-sm shadow-[0_2px_8px_rgba(201,154,46,.35)]"
      >
        <Navigation className="h-4 w-4" />
        RECORD VISIT
      </Button>

      {/* Record Visit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-primary font-bold text-base">Record Visit</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-5">
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

            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Part Payment</p>
              <div className="flex items-center gap-2">
                <Checkbox id="part-payment" checked={partPaymentMade} onCheckedChange={(v) => setPartPaymentMade(!!v)} />
                <Label htmlFor="part-payment" className="text-sm cursor-pointer">Part payment made</Label>
              </div>
              {partPaymentMade && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pmt-date" className="text-sm">Date</Label>
                    <Input id="pmt-date" type="date" value={partPaymentDate} onChange={e => setPartPaymentDate(e.target.value)} max={todayStr()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pmt-amount" className="text-sm">Amount (LKR)</Label>
                    <Input id="pmt-amount" type="number" min="0" step="0.01" value={partPaymentAmount} onChange={e => setPartPaymentAmount(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              )}
            </div>

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
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
