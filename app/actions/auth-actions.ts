"use server"

import { redirect } from "next/navigation"
import { setAuthCookie, clearAuthCookie } from "@/lib/jwt"
import type { LoginResponse } from "@/types/auth"

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const bankCode = formData.get("bankCode") as string
  const userName = formData.get("userName") as string
  const password = formData.get("password") as string

  if (!bankCode || !userName || !password) {
    return { error: "All fields are required" }
  }

  let response: Response
  try {
    response = await fetch(`${process.env.API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, userName, password }),
    })
  } catch {
    return { error: "Unable to connect to server" }
  }

  if (!response.ok) {
    return { error: "Invalid credentials" }
  }

  const data: LoginResponse = await response.json()

  await setAuthCookie({
    id: data.id || userName,
    userName: data.userName || userName,
    bankCode: data.bankCode,
    userType: data.role === 1 ? "Admin" : "General User",
    authToken: data.token,
  })

  redirect("/dashboard")
}

export async function logoutAction(): Promise<void> {
  await clearAuthCookie()
  redirect("/login")
}
