"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Navigation, LocateFixed, Loader2 } from "lucide-react"

declare global {
  interface Window {
    google: any
    googleMapsApiLoading: boolean
    googleMapsApiLoaded: boolean
  }
}

interface LoanVisitMapProps {
  lat: number
  lng: number
  loanName: string
  mapClassName?: string
}

export function LoanVisitMap({ lat, lng, loanName, mapClassName = "h-48" }: LoanVisitMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [mapError, setMapError] = useState("")
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)

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
      script.onerror = () => { window.googleMapsApiLoading = false; reject(new Error("Failed to load Google Maps")) }
      document.head.appendChild(script)
    })
  }, [])

  const initMap = useCallback(() => {
    if (!mapRef.current || typeof window.google === "undefined" || !window.google.maps) return false

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: { lat, lng },
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true,
    })

    new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      title: loanName,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
          `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#dc2626" stroke="#ffffff" strokeWidth="2"/>
          </svg>`
        ),
        scaledSize: new window.google.maps.Size(20, 20),
      },
    })

    mapInstanceRef.current = mapInstance
    return true
  }, [lat, lng, loanName])

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Place / update blue user marker when GPS coordinates arrive
  useEffect(() => {
    if (userLat == null || userLng == null || !mapInstanceRef.current) return

    const userPos = { lat: userLat, lng: userLng }

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userPos)
    } else {
      userMarkerRef.current = new window.google.maps.Marker({
        position: userPos,
        map: mapInstanceRef.current,
        title: "Your location",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
            `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2"/>
            </svg>`
          ),
          scaledSize: new window.google.maps.Size(20, 20),
        },
      })
    }
  }, [userLat, userLng])

  useEffect(() => {
    let retries = 0
    const attempt = () => {
      if (initMap()) {
        getLocation()
        return
      }
      if (++retries < 5) setTimeout(attempt, 500)
      else setMapError("Failed to initialize map")
    }
    loadGoogleMapsAPI()
      .then(() => setTimeout(attempt, 200))
      .catch((e) => setMapError(e.message || "Failed to load Google Maps"))
  }, [loadGoogleMapsAPI, initMap, getLocation])

  return (
    <div className="space-y-2">
      {mapError ? (
        <div className={`${mapClassName} rounded-lg border bg-muted flex items-center justify-center`}>
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      ) : (
        <div ref={mapRef} className={`${mapClassName} rounded-lg overflow-hidden border`} />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-1"
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")}
        >
          <Navigation className="h-3.5 w-3.5" />
          Navigate to Customer
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={getLocation}
          disabled={locating}
        >
          {locating
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <LocateFixed className="h-3.5 w-3.5" />
          }
          {locating ? "Locating…" : "Refresh"}
        </Button>
      </div>
    </div>
  )
}
