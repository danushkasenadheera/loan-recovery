import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/loan-visits/${id}/guarantor2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.authToken}`,
      },
      body: JSON.stringify({ Signature: body.signature }),
    })
    if (res.status === 404) return NextResponse.json({ error: "Visit not found" }, { status: 404 })
    if (res.status === 409) return NextResponse.json({ error: "Guarantor 2 signature already recorded" }, { status: 409 })
    if (!res.ok) return NextResponse.json({ error: "Failed to record signature" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
