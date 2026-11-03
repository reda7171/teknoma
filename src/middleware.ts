import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 1. Force HTTPS in production
  const proto = request.headers.get('x-forwarded-proto');
  if (process.env.NODE_ENV === 'production' && proto === 'http') {
    const host = request.headers.get('host') || 'riwaya.store';
    return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // 2. Force admin routes to always use French locale
  if (pathname.includes('/admin') && !pathname.startsWith('/fr/admin')) {
    const newPathname = pathname.replace(/^\/(ar|en)\/admin/, '/fr/admin').replace(/^\/admin/, '/fr/admin');
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    return NextResponse.redirect(url, 301);
  }
  
  const response = intlMiddleware(request);
  if (pathname.includes('/opengraph-image')) {
    response.headers.set('X-Robots-Tag', 'noindex, noarchive');
  }
  return response;
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ar|en|fr)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
