import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCanonicalUrl, buildCanonicalLinkHeader } from './lib/seo/canonical';

const intlMiddleware = createMiddleware(routing);

const BLOCKED_SCRAPERS = [
  'httrack',
  'sitesucker',
  'teleport',
  'offline explorer',
  'webcopier',
  'cyotek',
  'scrapy',
  'webharvest',
  'grabnet',
  'nikto',
  'sqlmap',
  'wpscan',
  'libwww-perl',
];

export default function middleware(request: NextRequest) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  if (BLOCKED_SCRAPERS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse('Access Denied', { status: 403 });
  }

  let pathname: string;
  try { pathname = decodeURIComponent(request.nextUrl.pathname) } catch { return new NextResponse(null, { status: 400 }) }
  if (pathname.startsWith('/uploads/school-lists/')) {
    const filename = pathname.slice('/uploads/school-lists/'.length);
    const response = NextResponse.redirect(new URL(`/api/admin/school-lists/files/${filename}`, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // Force admin routes to always use French locale
  if (pathname.includes('/admin') && !pathname.startsWith('/fr/admin')) {
    const newPathname = pathname.replace(/^\/(ar|en)\/admin/, '/fr/admin').replace(/^\/admin/, '/fr/admin');
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    const redirectRes = NextResponse.redirect(url, 301);
    redirectRes.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return redirectRes;
  }

  const response = intlMiddleware(request);
  if (pathname.includes('/opengraph-image')) {
    response.headers.set('X-Robots-Tag', 'noindex, noarchive');
  }

  // Bloquer l'indexation de l'espace administration pour préserver 100% du crawl budget
  if (pathname.includes('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // Set HTTP Canonical Link header (RFC 5988 / Google Search Central)
  // Strips all campaign and tracking query parameters (UTM, fbclid, etc.)
  if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    const canonicalUrl = getCanonicalUrl(pathname, request.nextUrl.searchParams, ['usedOnly']);
    response.headers.set('Link', buildCanonicalLinkHeader(canonicalUrl));
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/uploads/:path*', '/(ar|en|fr)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
