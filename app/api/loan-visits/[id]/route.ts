import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { id } = await params

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-visits/${id}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (res.status === 404) return NextResponse.json({ error: "Visit not found" }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch visit" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
