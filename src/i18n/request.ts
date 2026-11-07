import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    let messages = {};
    try {
        messages = (await import(`../messages/${locale}.json`)).default;
    } catch {
        try {
            messages = (await import(`../messages/${routing.defaultLocale}.json`)).default;
        } catch {
            messages = {};
        }
    }

    return {
        locale,
        messages,
        onError(error) {
            // Empêche les erreurs de messages manquants de provoquer une erreur HTTP 500
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[next-intl error]', error.message);
            }
        },
        getMessageFallback({ key, namespace }) {
            return `${namespace ? `${namespace}.` : ''}${key}`;
        }
    };
});
