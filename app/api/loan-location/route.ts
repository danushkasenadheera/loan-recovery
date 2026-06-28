import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const body = await request.json()
  const { bankCode, loanType, loanCode, loanAddressLat, loanAddressLang } = body

  if (!bankCode || !loanType || !loanCode || loanAddressLat === undefined || loanAddressLang === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const response = await fetch(`${process.env.API_BASE_URL}/loan`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.authToken}`,
      },
      body: JSON.stringify({
        BankCode: bankCode,
        LoanType: loanType,
        LoanCode: loanCode,
        LoanAddressLat: loanAddressLat,
        LoanAddressLang: loanAddressLang,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Failed to update loan location:", text)
      return NextResponse.json({ error: "Failed to update loan location" }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
