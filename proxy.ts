import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/register", "/api/auth"]
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  // If user is not authenticated and trying to access protected routes
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If user is authenticated and trying to access auth pages
  if (token && (pathname === "/login" || pathname === "/register")) {
    // Redirect to appropriate dashboard based on role
    const role = token.role as string
    const dashboardPath = {
      CLIENT: "/dashboard/client",
      CHEF: "/dashboard/chef",
      ADMIN: "/dashboard/admin"
    }[role] || "/dashboard"
    
    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }

  // Role-based access control for dashboard routes
  if (token && pathname.startsWith("/dashboard")) {
    const role = token.role as string
    
    // Admin routes
    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    
    // Chef routes
    if (pathname.startsWith("/dashboard/chef") && role !== "CHEF") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    
    // Client routes
    if (pathname.startsWith("/dashboard/client") && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
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
