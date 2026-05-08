import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const getAppBaseUrl = () => process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const legalAcceptancePath = '/legal/acceptance'

export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl
  const appBaseUrl = getAppBaseUrl()

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/register", "/api/auth", "/account-banned", legalAcceptancePath]

  // Check if the path is public
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path)
  )

  // Don't redirect API routes - they should return proper responses
  const isApiRoute = pathname.startsWith('/api/')

  // Check if user is banned and redirect to banned page (but not for API routes)
  if (token?.isBanned && pathname !== "/account-banned" && !isApiRoute) {
    return NextResponse.redirect(new URL("/account-banned", appBaseUrl))
  }

  const needsTermsAcceptance = token?.needsTermsAcceptance
  // Temporarily disable insurance verification check until UI is implemented
  const needsInsuranceVerification = false

  if (token && (needsTermsAcceptance || needsInsuranceVerification) && !pathname.startsWith(legalAcceptancePath) && !pathname.startsWith('/api/account/legal-acceptance') && !isApiRoute) {
    const redirectUrl = new URL(legalAcceptancePath, appBaseUrl)
    if (needsTermsAcceptance) {
      redirectUrl.searchParams.set('terms', '1')
    }
    if (needsInsuranceVerification) {
      redirectUrl.searchParams.set('insurance', '1')
    }
    return NextResponse.redirect(redirectUrl)
  }

  // If user is not authenticated and trying to access protected routes
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", appBaseUrl))
  }

  // If user is authenticated and trying to access auth pages
  if (token && (pathname === "/login" || pathname === "/register")) {
    if (needsTermsAcceptance) {
      const redirectUrl = new URL(legalAcceptancePath, appBaseUrl)
      redirectUrl.searchParams.set('terms', '1')
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect to appropriate dashboard based on role
    const role = token.role as string
    const dashboardPath = {
      CLIENT: "/dashboard/client",
      CHEF: "/dashboard/chef",
      ADMIN: "/dashboard/admin"
    }[role] || "/dashboard"
    
    return NextResponse.redirect(new URL(dashboardPath, appBaseUrl))
  }

  // Role-based access control for dashboard routes
  if (token && pathname.startsWith("/dashboard")) {
    const role = token.role as string
    
    // Admin routes
    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", appBaseUrl))
    }
    
    // Chef routes
    if (pathname.startsWith("/dashboard/chef") && role !== "CHEF") {
      return NextResponse.redirect(new URL("/dashboard", appBaseUrl))
    }
    
    // Client routes
    if (pathname.startsWith("/dashboard/client") && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", appBaseUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (image files)
     */
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
}
