import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { publicExactRoutes, publicRoutePrefixes } from '@/lib/public-routes'

const getAppBaseUrl = () => process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const legalAcceptancePath = '/legal/acceptance'
const publicGetApiRoutes = [
  /^\/api\/chefs$/,
  /^\/api\/chefs\/search$/,
  /^\/api\/chefs\/[^/]+$/,
  /^\/api\/experiences$/,
  /^\/api\/experiences\/[^/]+$/,
  /^\/api\/reviews$/,
  /^\/api\/health$/,
  /^\/api\/marketplace\/health$/,
]

export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl
  const appBaseUrl = getAppBaseUrl()

  const isApiRoute = pathname.startsWith('/api/')
  const isAuthApiRoute = pathname.startsWith('/api/auth')
  const isPublicGetApiRoute = request.method === 'GET' && publicGetApiRoutes.some((route) => route.test(pathname))
  const isPublicPath =
    publicExactRoutes.includes(pathname) ||
    publicRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    isAuthApiRoute ||
    isPublicGetApiRoute

  if (token?.isBanned && pathname !== '/account-banned' && !isApiRoute) {
    return NextResponse.redirect(new URL('/account-banned', appBaseUrl))
  }

  const needsTermsAcceptance = token?.needsTermsAcceptance
  if (
    token &&
    needsTermsAcceptance &&
    !pathname.startsWith(legalAcceptancePath) &&
    !pathname.startsWith('/api/account/legal-acceptance') &&
    !isApiRoute
  ) {
    const redirectUrl = new URL(legalAcceptancePath, appBaseUrl)
    redirectUrl.searchParams.set('terms', '1')
    redirectUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(redirectUrl)
  }

  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', appBaseUrl)
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`)

    if (pathname.startsWith('/dashboard/client')) {
      loginUrl.searchParams.set('role', 'CLIENT')
    } else if (pathname.startsWith('/dashboard/chef')) {
      loginUrl.searchParams.set('role', 'CHEF')
    } else if (pathname.startsWith('/dashboard/admin')) {
      loginUrl.searchParams.set('role', 'ADMIN')
    }

    return NextResponse.redirect(loginUrl)
  }

  if (token && (pathname === '/login' || pathname === '/register')) {
    if (needsTermsAcceptance) {
      const redirectUrl = new URL(legalAcceptancePath, appBaseUrl)
      redirectUrl.searchParams.set('terms', '1')
      return NextResponse.redirect(redirectUrl)
    }

    const role = token.role as string
    const dashboardPath = {
      CLIENT: '/dashboard/client',
      CHEF: '/dashboard/chef',
      ADMIN: '/dashboard/admin',
    }[role] || '/dashboard'

    return NextResponse.redirect(new URL(dashboardPath, appBaseUrl))
  }

  if (token && pathname.startsWith('/dashboard')) {
    const role = token.role as string

    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', appBaseUrl))
    }

    if (pathname.startsWith('/dashboard/chef') && role !== 'CHEF') {
      return NextResponse.redirect(new URL('/dashboard', appBaseUrl))
    }

    if (pathname.startsWith('/dashboard/client') && role !== 'CLIENT') {
      return NextResponse.redirect(new URL('/dashboard', appBaseUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}
