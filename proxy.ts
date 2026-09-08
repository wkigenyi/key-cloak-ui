import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/admin") && !request.auth?.user) {
    const login = new URL("/login", request.nextUrl.origin)
    login.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*"],
}
