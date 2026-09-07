import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Normalise une URL d'image ou une chaîne Base64 (Odoo)
 * @param raw L'image brute de la BDD
 * @returns L'image normalisée ou le placeholder
 */
export function normalizeImage(raw: string | null | undefined): string {
    const img = raw?.trim() || ''
    if (!img) return '/book-placeholder.png'
    
    if (process.env.NODE_ENV === 'development' && (img.startsWith('/uploads/') || img.startsWith('uploads/'))) {
        return `https://riwaya.store${img.startsWith('/') ? img : '/' + img}`;
    }

    // Déjà une URL ou déjà formaté
    if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/')) {
        // Ignorer si c'est un message d'erreur
        if (img.includes('cellule')) return '/book-placeholder.png'
        
        // Cas particulier : /9j/ détecté comme chemin local alors que c'est du JPEG Base64
        if (img.startsWith('/9j/')) return 'data:image/jpeg;base64,' + img
        return img
    }

    // Détection de chemin local sans slash (ex: uploads/books/...)
    if (img.startsWith('uploads/')) return '/' + img

    // Détection Base64 pure (Odoo)
    if (img.includes(' ')) return '/book-placeholder.png'
    
    if (img.startsWith('iVBOR')) return 'data:image/png;base64,' + img
    if (img.startsWith('/9j/')) return 'data:image/jpeg;base64,' + img
    if (img.length > 50) return 'data:image/jpeg;base64,' + img

    return img
}

/**
 * Génère une URL absolue pour l'image Open Graph.
 * Évite les redirections pour les URL externes ou locales,
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
    
    // Si c'est du base64 ou autre chose non géré, on passe par l'API pour que Next.js puisse servir le binaire
    return fallbackApiUrl;
}

/**
 * Retourne l'URL de base de l'application, en forçant le domaine public
 * si l'URL configurée pointe vers localhost ou une IP (fréquent avec un reverse proxy).
 */
export function getBaseUrl(): string {
    let url = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store';
    if (url.includes('127.0.0.1') || url.includes('localhost') || url.includes('167.86.108.246')) {
        url = 'https://riwaya.store';
    }
    return url;
}

/**
 * Calcule le score SEO d'un article à partir de son contenu.
 * Même logique que dans AdminPostsTable.
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
