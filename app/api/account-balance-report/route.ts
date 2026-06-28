import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const AccountNo = searchParams.get("AccountNo")
  const Records = searchParams.get("Records") ?? "50"

  if (!AccountNo) return NextResponse.json({ error: "AccountNo is required" }, { status: 400 })

  try {
    const params = new URLSearchParams({ AccountNo, Records })
    const res = await fetch(`${process.env.API_BASE_URL}/account-balance-report?${params}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch account history" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
