import { NextResponse } from "next/server"
import { getSession } from "@/lib/jwt"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/reminders/today`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch reminders" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Unable to connect to server" }, { status: 503 })
  }
}
