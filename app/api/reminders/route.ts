import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const BankCode = searchParams.get("BankCode")
  const LoanType = searchParams.get("LoanType")
  const LoanCode = searchParams.get("LoanCode")
  const Scope = searchParams.get("Scope") ?? "upcoming"

  if (!BankCode || !LoanType || !LoanCode) {
    return NextResponse.json({ error: "BankCode, LoanType and LoanCode are required" }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({ BankCode, LoanType, LoanCode, Scope })
    const res = await fetch(`${process.env.API_BASE_URL}/reminders?${params}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch reminders" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json()

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.authToken}`,
      },
      body: JSON.stringify({
        BankCode: body.bankCode,
        LoanType: body.loanType,
        LoanCode: body.loanCode,
        ReminderDate: body.reminderDate,
        Message: body.message,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to create reminder" }, { status: res.status })
    return NextResponse.json(await res.json(), { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
