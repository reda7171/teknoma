import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['fr', 'ar', 'en'],

    // Used when no locale matches
    defaultLocale: 'fr',
    localeDetection: false,
    localeCookie: {
        secure: process.env.NODE_ENV === 'production'
    }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
