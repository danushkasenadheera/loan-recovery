import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const BankCode = searchParams.get("BankCode")
  const LoanType = searchParams.get("LoanType")
  const LoanCode = searchParams.get("LoanCode")

  if (!BankCode || !LoanType || !LoanCode)
    return NextResponse.json({ error: "BankCode, LoanType and LoanCode are required" }, { status: 400 })

  try {
    const params = new URLSearchParams({ BankCode, LoanType, LoanCode })
    const res = await fetch(`${process.env.API_BASE_URL}/loan-details?${params}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (res.status === 404) return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch loan details" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
