import 'server-only'
import sanitizeHtmlLibrary from 'sanitize-html'
import { randomBytes } from 'node:crypto'

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
    if (!input) return ''

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim()
}

/**
 * Sanitize HTML content (for rich text editors)
 */
export function sanitizeHtml(html: string): string {
    if (typeof html !== 'string') return ''
    return sanitizeHtmlLibrary(html, {
        allowedTags: ['p','br','strong','b','em','i','u','s','h1','h2','h3','h4','h5','h6','ul','ol','li','a','img','blockquote','pre','code','table','thead','tbody','tr','th','td','span','div','hr','iframe'],
        allowedAttributes: { '*': ['class'], a: ['href','title','target','rel'], img: ['src','alt','title','width','height','loading'], iframe: ['src','width','height','allowfullscreen','title'] },
        allowedSchemes: ['http','https','mailto','tel'],
        allowedSchemesByTag: { img: ['http','https'], iframe: ['https'] },
        allowProtocolRelative: false,
        allowedIframeHostnames: ['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'],
        transformTags: { a: sanitizeHtmlLibrary.simpleTransform('a', { rel: 'noopener noreferrer' }) },
    })
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate phone number (Moroccan format)
 */
export function isValidPhone(phone: string): boolean {
    // Format marocain: +212XXXXXXXXX ou 0XXXXXXXXX
    const phoneRegex = /^(\+212|0)[5-7]\d{8}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[\/\\:*?"<>|]/g, '_') // Remplacer uniquement les caractères interdits par le système de fichiers
        .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '')
        .slice(0, 255)
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
        return false
    }
}

/**
 * Escape SQL-like patterns (for LIKE queries)
 */
export function escapeSqlLike(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&')
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
    if (!Number.isInteger(length) || length < 16 || length > 1024) throw new Error('Invalid token length')
    return randomBytes(Math.ceil(length * 3 / 4)).toString('base64url').slice(0, length)
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
    if (!query) return ''

    return query
        .trim()
        .slice(0, 100) // Limite de longueur
        .replace(/[<>]/g, '') // Supprimer les chevrons
        .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF-]/g, '') // Garder uniquement lettres, chiffres, espaces, arabe
}

/**
 * Hash sensitive data (for logging)
 */
export function hashForLogging(data: string): string {
    if (!data) return ''

    // Simple hash pour masquer les données sensibles dans les logs
    const visible = data.slice(0, 3)
    const masked = '*'.repeat(Math.min(data.length - 3, 10))

    return visible + masked
}
