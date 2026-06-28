"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, Navigation, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react"

interface GoogleMapComponentProps {
  loanLocation: { lat: number; lng: number } | null
  loanData: {
    bankCode: string
    loanType: string
    loanCode: string
    loanName: string
    loanAddress: string
  }
  dashboardHref: string
  mapClassName?: string
}

type GpsStatus = "idle" | "searching" | "located" | "error" | "denied"

declare global {
  interface Window {
    google: any
    googleMapsApiLoading: boolean
    googleMapsApiLoaded: boolean
  }
}

function getGpsQuality(accuracy: number) {
  if (accuracy <= 10)  return { label: "Excellent", textColor: "text-green-600",  dot: "bg-green-500" }
  if (accuracy <= 30)  return { label: "Good",      textColor: "text-green-600",  dot: "bg-green-400" }
  if (accuracy <= 100) return { label: "Fair",      textColor: "text-amber-600",  dot: "bg-amber-400" }
  return                      { label: "Poor",      textColor: "text-red-600",    dot: "bg-red-500"   }
}

export function GoogleMapComponent({ loanLocation, loanData, dashboardHref, mapClassName }: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userMarker, setUserMarker] = useState<any>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle")
  const [isWithin25m, setIsWithin25m] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isSettingLocation, setIsSettingLocation] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState("")
  const [locationError, setLocationError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [permissionChecked, setPermissionChecked] = useState(false)

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, [])

  const loadGoogleMapsAPI = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window.google !== "undefined" && window.google.maps) return resolve()
      if (window.googleMapsApiLoading) {
        const check = () => {
          if (typeof window.google !== "undefined" && window.google.maps) resolve()
          else if (!window.googleMapsApiLoading) reject(new Error("Google Maps failed to load"))
          else setTimeout(check, 100)
        }
        return check()
      }
      const existing = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existing) {
        const check = () => {
          if (typeof window.google !== "undefined" && window.google.maps) resolve()
          else setTimeout(check, 100)
        }
        return check()
      }
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) return reject(new Error("Google Maps API key is not configured"))
      window.googleMapsApiLoading = true
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
      script.async = true
      script.defer = true
      script.onload = () => { window.googleMapsApiLoading = false; window.googleMapsApiLoaded = true; resolve() }
      script.onerror = () => { window.googleMapsApiLoading = false; reject(new Error("Failed to load Google Maps API")) }
      document.head.appendChild(script)
    })
  }, [])

  const initMap = useCallback(() => {
    if (!mapRef.current || typeof window.google === "undefined" || !window.google.maps) return false
    const center = loanLocation || { lat: 7.8731, lng: 80.7718 }
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: loanLocation ? 15 : 8,
      center,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    })
    setMap(mapInstance)
    setIsMapLoaded(true)
    setMapError("")
    setTimeout(() => window.google.maps.event.trigger(mapInstance, "resize"), 100)
    if (loanLocation) {
      new window.google.maps.Marker({
        position: loanLocation,
        map: mapInstance,
        title: `${loanData.loanName} — Stored Location`,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
            `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="#dc2626" stroke="#ffffff" strokeWidth="2"/>
            </svg>`
          ),
          scaledSize: new window.google.maps.Size(20, 20),
        },
      })
    }
    return true
  }, [loanLocation, loanData])

  useEffect(() => {
    let retries = 0
    const attempt = () => {
      if (initMap()) return
      if (++retries < 5) setTimeout(attempt, 500)
      else setMapError("Failed to initialize map")
    }
    loadGoogleMapsAPI()
      .then(() => setTimeout(attempt, 200))
      .catch((e) => setMapError(e.message || "Failed to load Google Maps"))
  }, [loadGoogleMapsAPI, initMap])

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true)
    setGpsStatus("searching")
    setLocationError("")

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      setIsGettingLocation(false)
      setGpsStatus("error")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(userPos)
        setAccuracy(position.coords.accuracy)
        setGpsStatus("located")

        let within25m = false
        if (loanLocation) {
          const distance = calculateDistance(userPos.lat, userPos.lng, loanLocation.lat, loanLocation.lng)
          within25m = distance <= 25
          setIsWithin25m(within25m)
        }

        if (map && typeof window.google !== "undefined") {
          if (userMarker) userMarker.setMap(null)
          if (!within25m) {
            const marker = new window.google.maps.Marker({
              position: userPos,
              map,
              title: "Your Location",
              icon: {
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="#eab308" stroke="#ffffff" strokeWidth="2"/>
                  </svg>`
                ),
                scaledSize: new window.google.maps.Size(20, 20),
              },
            })
            setUserMarker(marker)
          } else {
            setUserMarker(null)
          }
          map.setCenter(userPos)
          map.setZoom(17)
        }
        setIsGettingLocation(false)
      },
      (error) => {
        if (error.code === 1) {
          setLocationPermissionDenied(true)
          setGpsStatus("denied")
          setLocationError("Location access denied. Enable location permissions in your browser settings, then reload the page.")
        } else {
          setGpsStatus("error")
          const messages: Record<number, string> = {
            2: "Location information unavailable. Check your GPS settings.",
            3: "Location request timed out. Please try again.",
          }
          setLocationError(messages[error.code] || error.message)
        }
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }, [map, loanLocation, calculateDistance, userMarker])

  useEffect(() => {
    if (!isMapLoaded || permissionChecked) return
    setPermissionChecked(true)
    const check = async () => {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName })
        if (result.state === "granted") getCurrentLocation()
        else if (result.state === "denied") {
          setLocationPermissionDenied(true)
          setGpsStatus("denied")
          setLocationError("Location access denied. Enable location permissions in your browser settings, then reload the page.")
        } else {
          setShowLocationPrompt(true)
        }
      } catch {
        setShowLocationPrompt(true)
      }
    }
    check()
  }, [isMapLoaded, permissionChecked, getCurrentLocation])

  const setLoanLocation = async () => {
    if (!userLocation) return
    setIsSettingLocation(true)
    setLocationError("")
    setSuccessMessage("")
    try {
      const response = await fetch("/api/loan-location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: loanData.bankCode,
          loanType: loanData.loanType,
          loanCode: loanData.loanCode,
          loanAddressLat: userLocation.lat,
          loanAddressLang: userLocation.lng,
        }),
      })
      if (response.ok) {
        setSuccessMessage("Location tagged successfully!")
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const data = await response.json()
        setLocationError(data.error || "Failed to set loan location")
      }
    } catch {
      setLocationError("An error occurred while setting the loan location")
    } finally {
      setIsSettingLocation(false)
      setShowConfirm(false)
    }
  }

  const canTag = !loanLocation || isWithin25m
  const quality = accuracy != null ? getGpsQuality(accuracy) : null

  return (
    <>
      {/* Location permission prompt */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Location Access Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  To tag this loan&apos;s GPS location, we need access to your device&apos;s location. Please allow when prompted by your browser.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setShowLocationPrompt(false); getCurrentLocation() }} className="w-full gap-2">
                <Navigation className="h-4 w-4" />
                Enable Location
              </Button>
              <Button variant="ghost" onClick={() => setShowLocationPrompt(false)} className="w-full">
                Not Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && userLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border shadow-lg max-w-xs w-full p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Save this location?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {loanLocation ? "This will update the existing tagged location." : "This will tag the loan with your current GPS position."}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg px-4 py-2.5 w-full text-center space-y-0.5">
                <p className="text-xs font-mono text-[#374151]">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </p>
                {accuracy != null && (
                  <p className="text-[10px] text-[#6B7280]">± {Math.round(accuracy)}m accuracy</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1" disabled={isSettingLocation}>
                Cancel
              </Button>
              <Button onClick={setLoanLocation} className="flex-1" disabled={isSettingLocation}>
                {isSettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map — flex-1 so it grows inside the page's flex-col */}
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {mapError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{mapError}</p>
          </div>
        )}

        {/* Map container — flex-1 so it grows to fill remaining space */}
        <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-[#E5E7EB] shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
          <div
            ref={mapRef}
            className="absolute inset-0 bg-muted"
          />

          {/* Loading overlay */}
          {!isMapLoaded && !mapError && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Floating GPS card */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E7EB] shadow-lg p-3 w-44">
            <p className="text-[10px] font-bold text-[#374151] uppercase tracking-wide mb-2">GPS Location</p>

            {gpsStatus === "idle" && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF] shrink-0" />
                <span className="text-xs text-[#6B7280]">Ready to locate</span>
              </div>
            )}

            {gpsStatus === "searching" && (
              <div className="flex items-center gap-1.5 mb-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                <span className="text-xs text-[#6B7280]">Searching...</span>
              </div>
            )}

            {gpsStatus === "located" && userLocation && quality && (
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${quality.dot}`} />
                  <span className={`text-xs font-semibold ${quality.textColor}`}>{quality.label}</span>
                </div>
                {accuracy != null && (
                  <p className="text-[10px] text-[#6B7280]">± {Math.round(accuracy)}m accuracy</p>
                )}
                <p className="text-[10px] font-mono text-[#374151] leading-relaxed">
                  {userLocation.lat.toFixed(5)}<br />
                  {userLocation.lng.toFixed(5)}
                </p>
              </div>
            )}

            {(gpsStatus === "error") && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs text-red-600">Unavailable</span>
              </div>
            )}

            {gpsStatus === "denied" && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs text-red-600">Access Denied</span>
              </div>
            )}

            {locationPermissionDenied ? (
              <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="w-full h-7 text-xs">
                Reload Page
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={getCurrentLocation}
                disabled={isGettingLocation || !isMapLoaded}
                variant="outline"
                className="w-full h-7 text-xs gap-1"
              >
                {isGettingLocation
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Navigation className="h-3 w-3" />
                }
                {gpsStatus === "located" ? "Relocate" : "Locate Me"}
              </Button>
            )}
          </div>

          {/* Within 25m badge */}
          {loanLocation && isWithin25m && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow">
                <CheckCircle2 className="h-3 w-3" />
                Within 25m of tagged location
              </span>
            </div>
          )}
        </div>

        {/* Error / success messages */}
        {locationError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{locationError}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button variant="outline" asChild className="gap-2">
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </Button>

          {canTag && (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!userLocation || isSettingLocation || !isMapLoaded}
              className="gap-2 flex-1 sm:flex-none sm:min-w-48"
            >
              {isSettingLocation
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MapPin className="h-4 w-4" />
              }
              {loanLocation ? "Update Tagged Location" : "Save Tagged Location"}
            </Button>
          )}
        </div>

      </div>
    </>
  )
}
