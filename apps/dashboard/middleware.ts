import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './src/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth')
  
  // Permitir acceso a las APIs de auth sin token
  if (isApiAuth) {
    return NextResponse.next()
  }
  
  // Si no hay token y no está en página de login, redirigir a login
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Si hay token y está en página de login, redirigir al dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Verificar token válido para rutas protegidas
  if (token && !isAuthPage) {
    const user = verifyToken(token)
    if (!user) {
      // Token inválido, eliminar cookie y redirigir a login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/api/forms/:path*',
    '/api/auth/:path*'
  ]
}