export function getLocalizedTitle(book: any, locale?: string): string {
    if (!book) return '';
    
    // Always display the title in the book's original language, regardless of the site locale.
    if (book.language) {
        const lang = book.language.toLowerCase();
        if ((lang === 'en' || lang === 'english') && book.titleEn) return book.titleEn;
        if ((lang === 'fr' || lang === 'french' || lang === 'français') && book.titleFr) return book.titleFr;
        if ((lang === 'ar' || lang === 'arabic' || lang === 'arabe') && book.title) return book.title;
    }
    
    // Fallback: prioritize the default title (Arabic), then French, then English.
    return book.title || book.titleFr || book.titleEn || '';
}

export function getLocalizedDescription(book: any, locale: string): string {
    if (!book) return '';
    if (locale === 'fr' && book.descriptionFr) return book.descriptionFr;
    if (locale === 'en' && book.descriptionEn) return book.descriptionEn;
    return book.description || '';
}

export function getLocalizedLongDescription(book: any, locale: string): string {
    if (!book) return '';
    if (locale === 'fr' && book.longDescriptionFr) return book.longDescriptionFr;
    if (locale === 'en' && book.longDescriptionEn) return book.longDescriptionEn;
    return book.longDescription || '';
}

export function getLocalizedPackTitle(pack: any, locale?: string): string {
    if (!pack) return '';

    const lang = (pack.language || pack.books?.[0]?.book?.language || '')?.toLowerCase();

    // Always display the pack title in its original language, consistent with book policy
    if (lang) {
        if (lang === 'en' || lang === 'english') {
            if (pack.nameEn) return pack.nameEn;
            if (pack.name && !/[\u0600-\u06FF]/.test(pack.name)) return pack.name;
        }
        if (lang === 'fr' || lang === 'french' || lang === 'français') {
            if (pack.nameFr) return pack.nameFr;
            if (pack.name && !/[\u0600-\u06FF]/.test(pack.name)) return pack.name;
        }
        if (lang === 'ar' || lang === 'arabic' || lang === 'arabe') {
            if (pack.name) return pack.name;
        }
    }

    if (locale === 'fr' && pack.nameFr) return pack.nameFr;
    if (locale === 'en' && pack.nameEn) return pack.nameEn;
    return pack.name || pack.nameEn || pack.nameFr || '';
}

export function getLocalizedPackDescription(pack: any, locale?: string): string {
    if (!pack) return '';

    const lang = (pack.language || pack.books?.[0]?.book?.language || '')?.toLowerCase();

    if (lang) {
        if ((lang === 'en' || lang === 'english') && pack.descriptionEn) return pack.descriptionEn;
        if ((lang === 'fr' || lang === 'french' || lang === 'français') && pack.descriptionFr) return pack.descriptionFr;
    }

    if (locale === 'fr' && pack.descriptionFr) return pack.descriptionFr;
    if (locale === 'en' && pack.descriptionEn) return pack.descriptionEn;
    return pack.description || pack.descriptionFr || pack.descriptionEn || '';
}

/**
 * Creates a URL-friendly slug from a string.
 */
export function slugify(text: string): string {
    if (!text) return '';
    // Gestion basique de l'arabe en conservant les caractères arabes mais en remplaçant les espaces
    const slug = text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')           // Replace spaces and underscores with -
        .replace(/[^\w\-\u0600-\u06FF]+/g, '') // Remove all non-word chars except Arabic characters
        .replace(/\-\-+/g, '-')            // Replace multiple - with single -
        .replace(/^-+/, '')                // Trim - from start of text
        .replace(/-+$/, '');               // Trim - from end of text
        
    // Limit slug length to ~60 characters to avoid huge URLs causing 502 Bad Gateway in Nginx
    if (slug.length > 60) {
        return slug.substring(0, 60).replace(/-[^-]*$/, '');
    }
    return slug;
}

/**
 * Generates an SEO-friendly URL for a book: /books/{id}-{slug}
 * Since the database ID is a UUID, we append the slug to the ID.
 * The routing system will only need the ID, which we can extract later if needed.
 */
export function generateBookUrl(book: any, locale: string): string {
    if (!book) return '/books';
    const localizedTitle = getLocalizedTitle(book, locale);
    const slug = slugify(localizedTitle);
    
    // Si le titre arabe ne donne pas un bon slug, 
    // on utilise juste l'ID.
    if (!slug) {
        return `/books/${book.id}`;
    }
    
    return `/books/${book.id}-${slug}`;
}
