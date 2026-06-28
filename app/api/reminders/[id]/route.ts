import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.authToken}`,
      },
      body: JSON.stringify({
        ReminderDate: body.reminderDate,
        Message: body.message,
      }),
    })
    if (res.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (res.status === 404) return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: "Failed to update reminder" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { id } = await params

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.authToken}` },
    })
    if (res.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (res.status === 404) return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: "Failed to delete reminder" }, { status: res.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
