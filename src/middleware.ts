import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/firebase/firebase'

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Check if the path includes dashboard
  if (path.includes('/dashboard')) {
    const session = await auth.currentUser
    
    // Redirect to login if no session
    if (!session) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // Continue with the request
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 