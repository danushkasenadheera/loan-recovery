"use client"

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

export interface SignaturePadRef {
  getSignature: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

export const SignaturePad = forwardRef<SignaturePadRef, { className?: string }>(({ className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  const setupCtx = useCallback((canvas: HTMLCanvasElement) => {
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
  }, [])

  useImperativeHandle(ref, () => ({
    getSignature: () => {
      if (!hasDrawnRef.current || !canvasRef.current) return null
      return canvasRef.current.toDataURL("image/png")
    },
    clear,
    isEmpty: () => !hasDrawnRef.current,
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Defer setup to ensure the canvas is painted and has dimensions
    const timer = setTimeout(() => setupCtx(canvas), 50)

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (canvas.width === 0) setupCtx(canvas)
      isDrawingRef.current = true
      lastPosRef.current = getPos(e, canvas)
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current || !lastPosRef.current) return
      e.preventDefault()
      const pos = getPos(e, canvas)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPosRef.current = pos
      hasDrawnRef.current = true
    }

    const endDraw = () => {
      isDrawingRef.current = false
      lastPosRef.current = null
    }

    canvas.addEventListener("mousedown", startDraw)
    canvas.addEventListener("mousemove", draw)
    canvas.addEventListener("mouseup", endDraw)
    canvas.addEventListener("mouseleave", endDraw)
    canvas.addEventListener("touchstart", startDraw, { passive: false })
    canvas.addEventListener("touchmove", draw, { passive: false })
    canvas.addEventListener("touchend", endDraw)

    return () => {
      clearTimeout(timer)
      canvas.removeEventListener("mousedown", startDraw)
      canvas.removeEventListener("mousemove", draw)
      canvas.removeEventListener("mouseup", endDraw)
      canvas.removeEventListener("mouseleave", endDraw)
      canvas.removeEventListener("touchstart", startDraw)
      canvas.removeEventListener("touchmove", draw)
      canvas.removeEventListener("touchend", endDraw)
    }
  }, [setupCtx])

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white cursor-crosshair touch-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clear}
        className="absolute top-1 right-1 h-6 px-2 text-xs text-muted-foreground"
      >
        Clear
      </Button>
      <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground/50 pointer-events-none select-none">
        Sign here
      </p>
    </div>
  )
})

SignaturePad.displayName = "SignaturePad"
