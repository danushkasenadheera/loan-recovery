"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Loader2, Navigation, AlertTriangle, CheckCircle2 } from "lucide-react"

interface GoogleMapComponentProps {
  loanLocation: { lat: number; lng: number } | null
  loanData: {
    bankCode: string
    loanType: string
    loanCode: string
    loanName: string
    loanAddress: string
  }
  mapClassName?: string
}

declare global {
  interface Window {
    google: any
    googleMapsApiLoading: boolean
    googleMapsApiLoaded: boolean
  }
}

export function GoogleMapComponent({ loanLocation, loanData, mapClassName }: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userMarker, setUserMarker] = useState<any>(null)
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

    const center = loanLocation || { lat: 7.8731, lng: 80.7718 } // Sri Lanka centre as default
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: loanLocation ? 15 : 8,
      center,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    })

    setMap(mapInstance)
    setIsMapLoaded(true)
    setMapError("")

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
    setLocationError("")

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(userPos)

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
          setLocationError("Location access denied. Enable location permissions in your browser settings, then reload the page.")
        } else {
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
        if (result.state === "granted") {
          getCurrentLocation()
        } else if (result.state === "denied") {
          setLocationPermissionDenied(true)
          setLocationError("Location access denied. Enable location permissions in your browser settings, then reload the page.")
        } else {
          setShowLocationPrompt(true)
        }
      } catch {
        // Permissions API not supported — show modal rather than calling directly
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

  return (
    <div className="space-y-3">
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
              <Button
                onClick={() => {
                  setShowLocationPrompt(false)
                  getCurrentLocation()
                }}
                className="w-full gap-2"
              >
                <Navigation className="h-4 w-4" />
                Enable Location
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowLocationPrompt(false)}
                className="w-full"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {mapError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{mapError}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <div
          ref={mapRef}
          className={`w-full bg-muted rounded-lg border ${mapClassName ?? "h-64"}`}
        />
        {!isMapLoaded && !mapError && (
          <div className="absolute inset-0 bg-muted rounded-lg border flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {loanLocation && (
        <p className="text-xs text-muted-foreground">
          Stored: {loanLocation.lat.toFixed(6)}, {loanLocation.lng.toFixed(6)}
        </p>
      )}

      <div className="space-y-2">
        {locationPermissionDenied ? (
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full gap-2 bg-transparent"
          >
            <Navigation className="h-4 w-4" />
            Reload Page
          </Button>
        ) : (
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation || !isMapLoaded}
            variant="outline"
            className="w-full gap-2 bg-transparent"
          >
            {isGettingLocation ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Getting Location...</>
            ) : (
              <><Navigation className="h-4 w-4" />Get My Location</>
            )}
          </Button>
        )}

        {canTag && !loanLocation && (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!userLocation || isSettingLocation || !isMapLoaded}
            className="w-full gap-2"
          >
            {isSettingLocation ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Setting Location...</>
            ) : (
              <><MapPin className="h-4 w-4" />Set Loan Location</>
            )}
          </Button>
        )}

        {loanLocation && isWithin25m && (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!userLocation || isSettingLocation || !isMapLoaded}
            className="w-full gap-2"
          >
            {isSettingLocation ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Updating Location...</>
            ) : (
              <><MapPin className="h-4 w-4" />Update Location</>
            )}
          </Button>
        )}
      </div>

      {showConfirm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium">Confirm location tag</p>
              <p className="text-xs text-muted-foreground">
                This will set the loan location to your current GPS position.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={setLoanLocation} disabled={isSettingLocation}>
                  {isSettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {locationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{locationError}</AlertDescription>
        </Alert>
      )}

      {loanLocation && isWithin25m && !showConfirm && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-xs text-green-800">
            You are within 25 metres of the tagged location.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
