import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const BankCode = searchParams.get("BankCode")
  const Name = searchParams.get("Name")
  const LoanType = searchParams.get("LoanType")

  if (!BankCode || !Name)
    return NextResponse.json({ error: "BankCode and Name are required" }, { status: 400 })

  const params = new URLSearchParams({ BankCode, Name })
  if (LoanType) params.set("LoanType", LoanType)

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-search?${params}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to search" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
