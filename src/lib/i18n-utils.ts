export function getLocalizedTitle(book: any, locale: string): string {
    if (!book) return '';
    
    // Si le livre est physiquement en arabe ou en anglais, on affiche toujours 
    // son titre original pour ne pas induire le client en erreur sur la langue du livre.
    if (book.language === 'ar' || book.language === 'en') {
        return book.title || '';
    }

    if (locale === 'fr' && book.titleFr) return book.titleFr;
    if (locale === 'en' && book.titleEn) return book.titleEn;
    return book.title || '';
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
