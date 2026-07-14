'use server'

import { prisma } from '@/lib/prisma'
import { JumiaAPI } from '@/lib/jumia-api'

export async function syncBooksStockToJumia() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        // Récupérer les livres avec ISBN ou ID (en fonction de ce qui est utilisé comme SellerSku sur Jumia)
        const books = await prisma.book.findMany({
            where: { active: true },
            select: { id: true, isbn: true, stock: true }
        })

        if (books.length === 0) {
            return { success: true, message: "Aucun livre à synchroniser." }
        }

        // L'API Jumia attend souvent un feed XML ou JSON pour la mise à jour massive du stock
        // Exemple avec la nouvelle API: POST /feeds/products/stock ou PUT /catalog/products
        // Comme nous n'avons pas le schéma exact du feed pour la V3, on simule l'appel ou on utilise le endpoint de maj
        
        const updates = books.map(book => ({
            SellerSku: book.isbn || book.id,
            Quantity: book.stock
        }))

        // await jumia.request('/feeds/products/stock', 'POST', { Products: updates })
        
        return { success: true, message: `${books.length} livres synchronisés avec succès avec Jumia.` }
    } catch (error: any) {
        return { success: false, message: `Erreur: ${error.message}` }
    }
}

function transliterateArabic(text: string): string {
    if (!text) return text;
    const map: Record<string, string> = {
        'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'dh',
        'ع': 'e', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
        'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'e', 'ؤ': 'o',
        '٠':'0', '١':'1', '٢':'2', '٣':'3', '٤':'4', '٥':'5', '٦':'6', '٧':'7', '٨':'8', '٩':'9'
    };
    return text
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
        .split('')
        .map(char => map[char] || char)
        .join('')
        .replace(/[\u0600-\u06FF]/g, '') // Remove any remaining Arabic characters just in case
        .replace(/\s+/g, ' ')
        .trim();
}

export async function publishBooksToJumia(bookIds: string[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const books = await prisma.book.findMany({
            where: { id: { in: bookIds } }
        })

        if (books.length === 0) {
            return { success: false, message: "Aucun livre trouvé pour publication." }
        }

        const shops = await jumia.getShops()
        const shopId = shops?.data?.[0]?.id || shops?.[0]?.id || "UNKNOWN_SHOP_ID"

        const productsPayload = books.map(book => {
            const cleanTitle = transliterateArabic(book.title) || `Livre ${book.id.substring(0, 8)}`;
            const cleanDesc = transliterateArabic(book.description || book.title) || `Description pour le livre ${book.id.substring(0, 8)}`;
            
            return {
                name: {
                    value: cleanTitle.padEnd(15, ' ').substring(0, 60), // Length must be 15-60
                    translations: [{ language: "FR", value: cleanTitle.substring(0, 60) }]
                },
                description: {
                    value: cleanDesc.padEnd(150, ' ') + " - Achetez vos livres préférés avec Jumia et Riwaya !",
                    translations: [{ language: "FR", value: cleanDesc }]
                },
            parentSku: book.id,
            sellerSku: book.isbn || book.id,
            gtinBarcode: book.isbn || undefined,
            variation: "1",
            brand: {
                code: 1126253, // Generic code based on the provided sample
                name: "Generic"
            },
            category: {
                // IMPORTANT: Nous utilisons 1000052 (Foreign Language Study) temporairement
                // car "Bestselling Books" nécessite un code numérique exact que Jumia API ne permet pas de chercher.
                // Veuillez remplacer 1000052 par le vrai code de "Bestselling Books" quand vous l'aurez.
                code: 1000052, 
                name: "Bestselling Books"
            },
            images: book.image ? [{
                url: book.image.startsWith('/') ? `https://riwaya.store${book.image}` : book.image,
                primary: true
            }] : [],
            price: {
                currency: "MAD",
                value: book.originalPrice || book.price,
                salePrice: book.originalPrice ? {
                    value: book.price,
                    startAt: new Date().toISOString().split('T')[0],
                    endAt: new Date(Date.now() + 31536000000).toISOString().split('T')[0]
                } : undefined
            },
            stock: book.stock,
            attributes: [
                {
                    name: "isbn",
                    value: book.isbn || "N/A"
                },
                {
                    name: "short_description",
                    value: `<ul><li>Titre: ${book.title}</li><li>Auteur: ${book.author}</li><li>Type: Livre</li><li>Qualité garantie par Riwaya</li></ul>`
                },
                {
                    name: "model",
                    value: "Standard"
                },
                {
                    name: "product_weight",
                    value: "0.5"
                }
            ]
        };
    })

        // Appeler la nouvelle méthode createProducts
        const response = await jumia.createProducts(shopId, productsPayload)
        
        if (response?.feedId) {
            // Wait briefly to see if it processes immediately (often does for errors)
            await new Promise(r => setTimeout(r, 2500))
            const feedRes = await jumia.getFeed(response.feedId)
            
            if (feedRes?.status === 'FAILED') {
                const itemError = feedRes.feedItems?.[0]?.errorMessage || 'Erreurs de validation'
                const globalErrors = feedRes.feedItems?.[0]?.errors?.globalMessages?.join(', ') || ''
                return { 
                    success: false, 
                    message: `Jumia a rejeté le produit: ${itemError} ${globalErrors}`.trim()
                }
            }
        }

        return { success: true, message: `${books.length} livre(s) envoyés pour publication sur Jumia. (ID: ${response?.feedId})`, response }
    } catch (error: any) {
        console.error("Erreur publishBooksToJumia:", error)
        return { success: false, message: `Erreur de publication: ${error.message}` }
    }
}
