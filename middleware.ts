import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT, isBackendTokenExpired } from "@/lib/jwt"

export async function middleware(request: NextRequest) {
  const cookieToken = request.cookies.get("auth-token")?.value
  const token = cookieToken ? await verifyJWT(cookieToken) : null
  const validSession = token !== null && !isBackendTokenExpired(token.authToken)
  const { pathname } = request.nextUrl

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (!validSession && pathname !== "/") {
    const response = NextResponse.redirect(new URL("/login", request.url))
    if (token) response.cookies.delete("auth-token")
    return response
  }

  if (validSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(validSession ? "/dashboard" : "/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.svg|manifest.json|sw.js).*)"],
}
