import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCanonicalUrl, buildCanonicalLinkHeader } from './lib/seo/canonical';
import { contentSecurityPolicy } from './lib/content-security-policy';

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

  // Redirection 301 permanente des domaines secondaires (riwaya.ma, www.*) vers l'hôte canonique configuré
  const rawHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase();
  const canonicalBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store').replace(/\/+$/, '');
  const canonicalHost = (() => {
    try { return new URL(canonicalBase).hostname.toLowerCase(); } catch { return 'riwaya.store'; }
  })();
  if (
    process.env.NODE_ENV === 'production' &&
    rawHost &&
    rawHost !== canonicalHost &&
    (rawHost === 'riwaya.ma' || rawHost === 'www.riwaya.ma' || rawHost === 'riwaya.store' || rawHost === 'www.riwaya.store')
  ) {
    const targetPath = request.nextUrl.pathname === '/' ? '/ar' : request.nextUrl.pathname;
    const redirectUrl = new URL(`${targetPath}${request.nextUrl.search}`, canonicalBase);
    return NextResponse.redirect(redirectUrl, 301);
  }

  let pathname: string;
  try { pathname = decodeURIComponent(request.nextUrl.pathname) } catch { return new NextResponse(null, { status: 400 }) }
  if (pathname.startsWith('/uploads/school-lists/')) {
    const filename = pathname.slice('/uploads/school-lists/'.length);
    const response = NextResponse.redirect(new URL(`/api/admin/school-lists/files/${filename}`, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // Public image URLs must keep their path; only school documents are private.
  if (pathname.startsWith('/uploads/')) return NextResponse.next();

  // Force admin routes to always use French locale
  if (pathname.includes('/admin') && !pathname.startsWith('/fr/admin')) {
    const newPathname = pathname.replace(/^\/(ar|en)\/admin/, '/fr/admin').replace(/^\/admin/, '/fr/admin');
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    const redirectRes = NextResponse.redirect(url, 301);
    redirectRes.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return redirectRes;
  }

  // Overwrite any client-supplied nonce and forward the policy to Next's renderer.
  // next-intl preserves these request headers on its rewrites and next responses.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', policy);
  const response = intlMiddleware(request);
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'private, no-store');
  if (pathname.includes('/opengraph-image')) {
    response.headers.set('X-Robots-Tag', 'noindex, noarchive');
  }

  // Prévention spam UGC & blocage d'indexation des routes privées, transactionnelles, profils, vendeurs et recherches internes
  const normalizedNoIndexPath = pathname.toLowerCase();
  const isPrivateOrUgcPath =
    /^\/(?:(?:ar|fr|en)\/)?(?:admin|seller|cart|checkout|orders|track|wishlist|reading-list|reset-password|deposer-liste)(?:\/|$)/.test(normalizedNoIndexPath) ||
    /^\/(?:(?:ar|fr|en)\/)?community\/(?:profile|exchanges|exchange|notifications|login|register|reading-list|books)(?:\/|$)/.test(normalizedNoIndexPath);

  if (isPrivateOrUgcPath) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  } else if (
    (request.nextUrl.searchParams.has('search') || request.nextUrl.searchParams.has('q')) &&
    !response.headers.has('X-Robots-Tag')
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
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
