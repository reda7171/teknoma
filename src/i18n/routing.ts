import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['ar', 'fr', 'en'],

    // Used when no locale matches
    defaultLocale: 'ar',
    // Désactive la détection automatique Accept-Language qui forçait /en sur les crawlers et visiteurs depuis riwaya.ma
    localeDetection: false,
    localeCookie: {
        name: 'NEXT_LOCALE',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60, // 1 an
        sameSite: 'lax',
    }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
