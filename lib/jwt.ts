import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key")
const COOKIE_NAME = "auth-token"

export interface JWTPayload {
  userId: string
  userName: string
  bankCode: string
  userType: string
  authToken: string
  exp: number
  iat: number
}

export interface User {
  id: string
  userName: string
  bankCode: string
  userType: string
  authToken: string
}

export async function createJWT(user: User): Promise<string> {
  return await new SignJWT({
    userId: user.id,
    userName: user.userName,
    bankCode: user.bankCode,
    userType: user.userType,
    authToken: user.authToken,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function isBackendTokenExpired(authToken: string): boolean {
  const payload = decodeJWTPayload(authToken)
  if (!payload?.exp || typeof payload.exp !== "number") return false
  return Math.floor(Date.now() / 1000) >= payload.exp
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(user: User): Promise<void> {
  const token = await createJWT(user)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  })
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = await verifyJWT(token)
    if (!payload) return null
    if (isBackendTokenExpired(payload.authToken)) return null
    return {
      id: payload.userId,
      userName: payload.userName,
      bankCode: payload.bankCode,
      userType: payload.userType,
      authToken: payload.authToken,
    }
  } catch {
    return null
  }
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
