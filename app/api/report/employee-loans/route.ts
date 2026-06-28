import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const params = new URLSearchParams({
    BankCode: searchParams.get("BankCode") ?? "",
    EmpNo: searchParams.get("EmpNo") ?? "",
    LoanType: searchParams.get("LoanType") ?? "",
  })

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/report/employee-loans?${params}`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
