import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "@/lib/jwt"

export async function middleware(request: NextRequest) {
  const cookieToken = request.cookies.get("auth-token")?.value
  const token = cookieToken ? await verifyJWT(cookieToken) : null
  const { pathname } = request.nextUrl

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (!token && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)"],
}
