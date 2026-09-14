import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Normalise une URL d'image ou une chaÃ®ne Base64 (Odoo)
 * @param raw L'image brute de la BDD
 * @returns L'image normalisÃ©e ou le placeholder
 */
export function normalizeImage(raw: string | null | undefined): string {
    const img = raw?.trim() || ''
    if (!img) return '/book-placeholder.png'
    
    // Always use absolute URL for uploads so Next.js Image optimizer fetches via HTTP
    // This fixes issues where the local public directory doesn't have the uploaded files.
    if (img.startsWith('/uploads/') || img.startsWith('uploads/')) {
        return `https://riwaya.store${img.startsWith('/') ? img : '/' + img}`;
    }

    // DÃ©jÃ  une URL ou dÃ©jÃ  formatÃ©
    if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/')) {
        // Ignorer si c'est un message d'erreur
        if (img.includes('cellule')) return '/book-placeholder.png'
        
        // Cas particulier : /9j/ dÃ©tectÃ© comme chemin local alors que c'est du JPEG Base64
        if (img.startsWith('/9j/')) return 'data:image/jpeg;base64,' + img
        return img
    }

    // DÃ©tection Base64 pure (Odoo)
    if (img.includes(' ')) return '/book-placeholder.png'
    
    if (img.startsWith('iVBOR')) return 'data:image/png;base64,' + img
    if (img.startsWith('/9j/')) return 'data:image/jpeg;base64,' + img
    if (img.length > 50) return 'data:image/jpeg;base64,' + img

    return img
}

/**
 * GÃ©nÃ¨re une URL absolue pour l'image Open Graph.
 * Ã‰vite les redirections pour les URL externes ou locales,
 * et utilise l'API de fallback uniquement pour le Base64.
 */
export function getOgImageUrl(raw: string | null | undefined, baseUrl: string, fallbackApiUrl: string): string {
    const img = normalizeImage(raw);
    
    if (img.startsWith('http')) {
        return img;
    }
    
    if (img.startsWith('/')) {
        return `${baseUrl}${img}`;
    }
    
    // Si c'est du base64 ou autre chose non gÃ©rÃ©, on passe par l'API pour que Next.js puisse servir le binaire
    return fallbackApiUrl;
}

/**
 * Retourne l'URL de base de l'application, en forÃ§ant le domaine public
 * si l'URL configurÃ©e pointe vers localhost ou une IP (frÃ©quent avec un reverse proxy).
 */
export function getBaseUrl(): string {
    let url = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store';
    if (url.includes('127.0.0.1') || url.includes('localhost') || url.includes('167.86.108.246')) {
        url = 'https://riwaya.store';
    }
    return url;
}

/**
 * Calcule le score SEO d'un article Ã  partir de son contenu.
 * MÃªme logique que dans AdminPostsTable.
 */
export function computePostSeoScore(content: string | null | undefined): number {
    const contentStr = content || '';
    let score = 0;

    const hasImage = contentStr.includes('<img') || /!\[.*?\]\(.*?\)/.test(contentStr);
    const hasLink = contentStr.includes('<a href=') || /(?<!!)\[.*?\]\(.*?\)/.test(contentStr);

    const plainText = contentStr
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/[#*`_]/g, ' ');
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    score += Math.min(50, Math.floor(wordCount / 10));
    if (hasImage) score += 25;
    if (hasLink) score += 25;

    return Math.min(100, score);
}

export function calculate3For4Discount(items: { type: string, price: number, quantity: number }[]): number {
    // Ne prendre en compte que les livres physiques (type === 'BOOK')
    const bookItems = items.filter(item => item.type === 'BOOK');
    
    // Aplatir le panier pour avoir une liste de prix (ex: 2 livres à 100 = [100, 100])
    const allPrices: number[] = [];
    bookItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
            allPrices.push(item.price);
        }
    });

    if (allPrices.length < 4) return 0;

    // Trier les prix par ordre croissant (le moins cher en premier)
    allPrices.sort((a, b) => a - b);

    // Calculer le nombre de livres gratuits (1 pour chaque lot de 4)
    const freeBooksCount = Math.floor(allPrices.length / 4);

    // Sommer les prix des N livres les moins chers
    let discount = 0;
    for (let i = 0; i < freeBooksCount; i++) {
        discount += allPrices[i];
    }

    return discount;
}


