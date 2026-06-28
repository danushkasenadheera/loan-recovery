import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const NIC = new URL(request.url).searchParams.get("NIC")
  if (!NIC) return NextResponse.json({ error: "NIC is required" }, { status: 400 })

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-owner-accounts?NIC=${encodeURIComponent(NIC)}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch accounts" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
