import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function PUT(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { id } = await params

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders/${id}/attend`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${session.authToken}` },
    })
    if (res.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (res.status === 404) return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: "Failed to attend reminder" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
