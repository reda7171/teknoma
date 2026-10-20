'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import ExcelJS from 'exceljs'
import { verifyAdmin } from './auth'

export type RejectedRow = {
    line: number
    title: string
    reason: string
    lang?: string
    price?: string | number
    oldPrice?: string | number
    url?: string
    image?: string
}

export type BulkImportResult = {
    success: boolean
    message: string
    imported?: number
    failed?: number
    errors?: string[]
    rejectedRows?: RejectedRow[]
}

export type ProgressCallback = (data: {
    current: number
    total: number
    percent: number
    title?: string
    imported: number
    failed: number
}) => void | Promise<void>

function extractCellValue(val: unknown): string {
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if (obj.hyperlink) return String(obj.hyperlink).trim()
        if (obj.text) return String(obj.text).trim()
        if (obj.result !== undefined && obj.result !== null) return String(obj.result).trim()
    }
    return String(val).trim()
}

function parseNumericValue(val: unknown): number {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if ('result' in obj && typeof obj.result === 'number') return obj.result
        if ('text' in obj) val = obj.text
        else if ('result' in obj) val = obj.result
    }
    const cleanStr = String(val).trim().replace(/\s/g, '').replace(/,/g, '.')
    const match = cleanStr.match(/\d+(?:\.\d+)?/)
    return match ? parseFloat(match[0]) : 0
}

function getField(row: Record<string, unknown>, aliases: string[]): unknown {
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
            return row[alias]
        }
    }
    const lowerAliases = aliases.map(a => a.toLowerCase().trim())
    for (const key of Object.keys(row)) {
        if (lowerAliases.includes(key.toLowerCase().trim())) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key]
            }
        }
    }
    return undefined
}

/**
 * Importer des livres en masse depuis un fichier Excel ou CSV
 */
export async function importBooksFromExcel(
    formData: FormData | any,
    onProgress?: ProgressCallback
): Promise<BulkImportResult> {
    try {
        await verifyAdmin() // OWASP A01: Broken Access Control

        const file = formData.get('file') as File

        if (!file) {
            return { success: false, message: 'Aucun fichier fourni' }
        }

        const data: Record<string, unknown>[] = []
        const fileName = (file.name || '').toLowerCase()

        if (fileName.endsWith('.csv')) {
            // Support CSV avec détection de séparateur (, ou ;)
            let text = await file.text()
            // Retirer le BOM UTF-8 si présent
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1)
            }
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
            if (lines.length <= 1) {
                return { success: false, message: 'Le fichier CSV est vide' }
            }

            const separator = lines[0].includes(';') ? ';' : ','
            const parseCsvLine = (line: string): string[] => {
                const values: string[] = []
                let current = ''
                let inQuotes = false
                for (let i = 0; i < line.length; i++) {
                    const char = line[i]
                    if (char === '"') {
                        inQuotes = !inQuotes
                    } else if (char === separator && !inQuotes) {
                        values.push(current.trim())
                        current = ''
                    } else {
                        current += char
                    }
                }
                values.push(current.trim())
                return values
            }

            const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i]).map(c => c.replace(/^["']|["']$/g, '').trim())
                const rowData: Record<string, unknown> = {}
                headers.forEach((h, idx) => {
                    rowData[h] = cols[idx] !== undefined ? cols[idx] : ''
                })
                data.push(rowData)
            }
        } else {
            // Support Excel (.xlsx, .xls)
            const arrayBuffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(arrayBuffer as unknown as ExcelJS.Buffer)

            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                return { success: false, message: 'Le fichier Excel est vide' }
            }

            const headers: string[] = []
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber - 1] = extractCellValue(cell.value)
            })

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return // ignorer l'en-tête
                const rowData: Record<string, unknown> = {}
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber - 1]
                    if (header) rowData[header] = cell.value
                })
                data.push(rowData)
            })
        }

        if (!data || data.length === 0) {
            return { success: false, message: 'Le fichier ne contient aucune donnée' }
        }

        let imported = 0
        let failed = 0
        const errors: string[] = []
        const rejectedRows: RejectedRow[] = []

        for (let i = 0; i < data.length; i++) {
            const row = data[i]

            try {
                // Lecture des colonnes selon la nouvelle structure (et compatibilité avec l'ancienne)
                const titleRaw = extractCellValue(getField(row, ['nom', 'Nom', 'title', 'Titre', 'name', 'Name']))
                const titleStr = titleRaw || ''
                const langRaw = extractCellValue(getField(row, ['lang', 'Lang', 'language', 'langue'])).toLowerCase()
                const priceVal = getField(row, ['prix', 'Prix', 'Prix de vente', 'price', 'Price', 'prix_vente'])
                const parsedPrice = parseNumericValue(priceVal)
                const oldPriceVal = getField(row, ['ancien_prix', 'Ancien_prix', 'ancien prix', 'Ancien prix', 'Ancien Prix', 'originalPrice', 'original_price', 'prix_barre'])
                const parsedOldPrice = parseNumericValue(oldPriceVal)
                const urlVal = extractCellValue(getField(row, ['url', 'Url', 'URL', 'link', 'Link', 'lien', 'Lien', 'previewUrl']))
                let imageStr = extractCellValue(getField(row, ['image', 'Image', 'photo', 'Photo', 'cover', 'Cover', 'img']))
                if (!imageStr && urlVal) {
                    const isImageLink = /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(urlVal) ||
                                        urlVal.includes('/unsafe/') ||
                                        urlVal.includes('/product/') ||
                                        urlVal.includes('/image') ||
                                        urlVal.includes('/img/') ||
                                        urlVal.includes('googleusercontent.com')
                    if (isImageLink) {
                        imageStr = urlVal
                    }
                }

                // Langue (fr, arb -> ar, en)
                let language = 'fr'
                if (['arb', 'ar', 'arabe', 'arabic'].includes(langRaw)) {
                    language = 'ar'
                } else if (['en', 'eng', 'anglais', 'english'].includes(langRaw)) {
                    language = 'en'
                } else if (['fr', 'fra', 'francais', 'français', 'french'].includes(langRaw)) {
                    language = 'fr'
                }

                // Validation 1: Titre obligatoire
                if (!titleStr) {
                    const reason = 'Titre manquant (la colonne "nom" est vide)'
                    errors.push(`Ligne ${i + 2}: ${reason}`)
                    rejectedRows.push({
                        line: i + 2,
                        title: 'Sans nom',
                        reason,
                        lang: langRaw || language,
                        price: priceVal !== undefined ? String(priceVal) : '',
                        oldPrice: oldPriceVal !== undefined ? String(oldPriceVal) : '',
                        url: urlVal || '',
                        image: imageStr || '',
                    })
                    failed++
                    continue
                }

                // Validation 2: Prix de vente obligatoire et valide (> 0)
                if (priceVal === undefined || priceVal === null || String(priceVal).trim() === '' || isNaN(parsedPrice) || parsedPrice <= 0) {
                    const reason = 'Prix de vente manquant ou invalide (doit être supérieur à 0)'
                    errors.push(`Ligne ${i + 2}: ${reason}`)
                    rejectedRows.push({
                        line: i + 2,
                        title: String(titleStr),
                        reason,
                        lang: language,
                        price: priceVal !== undefined ? String(priceVal) : '',
                        oldPrice: oldPriceVal !== undefined ? String(oldPriceVal) : '',
                        url: urlVal || '',
                        image: imageStr || '',
                    })
                    failed++
                    continue
                }

                // Auteur : soit fourni via Marque/Auteur, soit extrait depuis "Titre - Auteur", soit fallback
                let authorStr = extractCellValue(getField(row, ['Marque', 'marque', 'Auteur', 'auteur', 'author', 'Author']))
                if (!authorStr && titleStr.includes(' - ')) {
                    const parts = titleStr.split(' - ')
                    if (parts.length >= 2) {
                        authorStr = parts[parts.length - 1].trim()
                    }
                }
                if (!authorStr) {
                    authorStr = language === 'ar' ? 'دار النشر رواية' : 'Riwaya Édition'
                }

                // Normalisation image
                if (imageStr) {
                    imageStr = imageStr.trim().replace(/^["']|["']$/g, '')
                    if (imageStr.startsWith('//')) {
                        imageStr = 'https:' + imageStr
                    } else if (imageStr.startsWith('http://') && !imageStr.includes('localhost') && !imageStr.includes('127.0.0.1')) {
                        imageStr = imageStr.replace('http://', 'https://')
                    }

                    if (!imageStr.startsWith('data:') && !imageStr.startsWith('http')) {
                        if (imageStr.startsWith('/9j/')) {
                            imageStr = 'data:image/jpeg;base64,' + imageStr
                        } else if (imageStr.startsWith('iVBOR')) {
                            imageStr = 'data:image/png;base64,' + imageStr
                        } else if (!imageStr.startsWith('/') && imageStr.length > 100) {
                            imageStr = 'data:image/jpeg;base64,' + imageStr
                        }
                    }
                } else {
                    imageStr = '/book-placeholder.png'
                }

                // Description
                const descVal = extractCellValue(getField(row, ['description', 'Description', 'resume', 'desc']))
                const descriptionStr = descVal || (language === 'ar' 
                    ? `وصف كتاب ${titleStr} متوفر للطلب عبر الدفع عند الاستلام على منصة رواية.`
                    : `Livre: ${titleStr}${authorStr ? ' par ' + authorStr : ''}. Disponible en livraison rapide avec paiement à la livraison.`)

                // Stock : 100 par défaut si non spécifié
                const stockVal = getField(row, ['stock', 'Stock', 'quantite', 'quantity'])
                const parsedStock = stockVal !== undefined ? parseInt(String(stockVal)) : 100
                const finalStock = isNaN(parsedStock) ? 100 : parsedStock

                // ISBN
                const isbnVal = extractCellValue(getField(row, ['isbn', 'ISBN']))
                if (isbnVal) {
                    const existing = await prisma.book.findUnique({
                        where: { isbn: isbnVal }
                    })
                    if (existing) {
                        const reason = `Le livre avec l'ISBN ${isbnVal} existe déjà.`
                        errors.push(`Ligne ${i + 2}: ${reason}`)
                        rejectedRows.push({
                            line: i + 2,
                            title: String(titleStr),
                            reason,
                            lang: language,
                            price: parsedPrice,
                            oldPrice: parsedOldPrice > 0 ? parsedOldPrice : '',
                            url: urlVal || '',
                            image: imageStr || '',
                        })
                        failed++
                        continue
                    }
                }

                await prisma.book.create({
                    data: {
                        title: String(titleStr),
                        author: String(authorStr),
                        description: String(descriptionStr),
                        isbn: isbnVal || null,
                        price: parsedPrice,
                        originalPrice: parsedOldPrice > 0 ? parsedOldPrice : null,
                        stock: finalStock,
                        image: String(imageStr),
                        category: extractCellValue(getField(row, ['category', 'Catégorie', 'categorie'])) || null,
                        language: language,
                        previewUrl: urlVal || null,
                        active: true,
                    },
                })

                imported++
            } catch (error) {
                const reason = error instanceof Error ? error.message : 'Erreur inconnue'
                errors.push(`Ligne ${i + 2}: ${reason}`)
                const currentTitle = extractCellValue(getField(row, ['nom', 'Nom', 'title', 'Titre', 'name', 'Name'])) || 'Sans titre'
                const langRaw = extractCellValue(getField(row, ['lang', 'Lang', 'language', 'langue'])).toLowerCase()
                const priceVal = getField(row, ['prix', 'Prix', 'Prix de vente', 'price', 'Price', 'prix_vente'])
                const oldPriceVal = getField(row, ['ancien_prix', 'Ancien_prix', 'ancien prix', 'Ancien prix', 'Ancien Prix'])
                const urlVal = extractCellValue(getField(row, ['url', 'Url', 'URL', 'link', 'Link']))
                const imgVal = extractCellValue(getField(row, ['image', 'Image', 'photo', 'Photo']))
                rejectedRows.push({
                    line: i + 2,
                    title: String(currentTitle),
                    reason,
                    lang: langRaw,
                    price: priceVal !== undefined ? String(priceVal) : '',
                    oldPrice: oldPriceVal !== undefined ? String(oldPriceVal) : '',
                    url: urlVal,
                    image: imgVal,
                })
                failed++
            }

            if (onProgress) {
                try {
                    await onProgress({
                        current: i + 1,
                        total: data.length,
                        percent: Math.round(((i + 1) / data.length) * 100),
                        title: String(extractCellValue(getField(row, ['nom', 'Nom', 'title', 'Titre', 'name', 'Name'])) || 'Livre'),
                        imported,
                        failed,
                    })
                } catch {
                    // Ignorer les erreurs d'envoi de progression
                }
            }
        }

        try {
            revalidatePath('/[locale]/admin/books', 'page')
            revalidatePath('/[locale]/books', 'page')
            revalidatePath('/admin/books')
            revalidatePath('/books')
            revalidatePath('/')
        } catch (revalErr) {
            console.warn('[BulkImport] Erreur revalidation:', revalErr)
        }

        return {
            success: true,
            message: `Importation terminée. ${imported} livre(s) importé(s), ${failed} échec(s)`,
            imported,
            failed,
            errors: errors.length > 0 ? errors : undefined,
            rejectedRows: rejectedRows.length > 0 ? rejectedRows : undefined,
        }
    } catch (error: unknown) {
        const err = error as Error
        console.error('Erreur lors de l\'importation:', err)
        return {
            success: false,
            message: err?.message || 'Une erreur est survenue lors de l\'importation',
        }
    }
}

/**
 * Générer un template Excel pour l'importation au format lang, nom, prix, ancien_prix, url, image
 */
export async function generateExcelTemplate() {
    try {
        await verifyAdmin()

        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'Riwaya'
        const worksheet = workbook.addWorksheet('Livres')

        worksheet.columns = [
            { header: 'lang', key: 'lang', width: 10 },
            { header: 'nom', key: 'nom', width: 45 },
            { header: 'prix', key: 'prix', width: 16 },
            { header: 'ancien_prix', key: 'ancien_prix', width: 16 },
            { header: 'url', key: 'url', width: 65 },
            { header: 'image', key: 'image', width: 65 },
        ]

        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FF1E293B' }, size: 11 }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
        }

        const sampleRows = [
            {
                lang: 'fr',
                nom: 'Essais de psychanalyse - Sigmund Freud',
                prix: '145.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/fr/book-bank-publication-essais-de-psychanalyse-sigmund-freud-64639450.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/05/493646/1.jpg?2323',
            },
            {
                lang: 'fr',
                nom: 'pouvoir illimité',
                prix: '94.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/fr/book-bank-publication-pouvoir-illimite-64639407.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/493646/1.jpg?1683',
            },
            {
                lang: 'arb',
                nom: 'علم الإقتصاد ببساطة',
                prix: '110.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-economie-simplifiee-8711291.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/19/21178/1.jpg?8826',
            },
            {
                lang: 'arb',
                nom: 'علم المقابلات الجديد: دراسة علمية للمقابلات',
                prix: '210.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-interviewology-le-nouvel-art-de-l-entretien-87430195.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/59/103478/1.jpg?8658',
            },
            {
                lang: 'arb',
                nom: 'علم نفس القيادة: مبادئ خالدة لتحسين إدارتك للأفراد والفرق ولنفسك!',
                prix: '220.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-la-psychologie-du-leadership-principes-intemporels-pour-ameliorer-votre-gestion-des-individus-des-equipes-et-de-vous-meme-87430311.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/11/303478/1.jpg?8731',
            },
            {
                lang: 'arb',
                nom: 'علمتني سورة البقرة',
                prix: '124.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/ar/book-bank-publication-63903607.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/630636/1.jpg?2563',
            },
        ]

        sampleRows.forEach(row => worksheet.addRow(row))

        const buffer = await workbook.xlsx.writeBuffer()
        return {
            success: true,
            base64: Buffer.from(buffer).toString('base64'),
            filename: 'template_livres_riwaya.xlsx',
        }
    } catch {
        return null
    }
}

/**
 * Mettre à jour le stock depuis un fichier TSV (Nom\tstock)
 */
export async function updateStockFromTsv(
    formData: FormData | any,
    onProgress?: ProgressCallback
): Promise<BulkImportResult> {
    try {
        await verifyAdmin()
        const file = formData.get('file') as File

        if (!file) {
            return { success: false, message: 'Aucun fichier fourni' }
        }

        const text = await file.text()
        const lines = text.split(/\r?\n/)
        
        if (lines.length <= 1) {
            return { success: false, message: 'Le fichier est vide ou invalide' }
        }

        let updated = 0
        let failed = 0
        const errors: string[] = []
        const rejectedRows: RejectedRow[] = []

        // Ignorer l'en-tête (Nom	stock)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const parts = line.split('\t')
            if (parts.length < 2) {
                const reason = 'Format invalide (manque tabulation entre Nom et Stock)'
                errors.push(`Ligne ${i + 1}: ${reason}`)
                rejectedRows.push({ line: i + 1, title: line, reason })
                failed++
                continue
            }

            const title = parts[0].trim()
            const stockStr = parts[1].trim()
            const stockValue = parseInt(stockStr)

            if (!title) {
                const reason = 'Nom manquant'
                errors.push(`Ligne ${i + 1}: ${reason}`)
                rejectedRows.push({ line: i + 1, title: '', reason })
                failed++
                continue
            }

            if (isNaN(stockValue)) {
                const reason = `Valeur de stock invalide pour "${title}"`
                errors.push(`Ligne ${i + 1}: ${reason}`)
                rejectedRows.push({ line: i + 1, title, reason })
                failed++
                continue
            }

            // Recherche exacte du livre
            const book = await prisma.book.findFirst({
                where: { 
                    title: title.trim()
                }
            })

            if (!book) {
                const reason = `Livre "${title}" introuvable`
                errors.push(`Ligne ${i + 1}: ${reason}`)
                rejectedRows.push({ line: i + 1, title, reason })
                failed++
                continue
            }

            await prisma.book.update({
                where: { id: book.id },
                data: { stock: stockValue }
            })

            updated++

            if (onProgress) {
                try {
                    await onProgress({
                        current: i,
                        total: lines.length - 1,
                        percent: Math.round((i / (lines.length - 1)) * 100),
                        title,
                        imported: updated,
                        failed,
                    })
                } catch {
                    // Ignorer les erreurs d'envoi de progression
                }
            }
        }

        revalidatePath('/admin/books')
        revalidatePath('/')

        return {
            success: true,
            message: `Mise à jour du stock terminée. ${updated} livre(s) mis à jour, ${failed} échec(s)`,
            imported: updated,
            failed,
            errors: errors.length > 0 ? errors : undefined,
            rejectedRows: rejectedRows.length > 0 ? rejectedRows : undefined,
        }
    } catch (error: unknown) {
        const err = error as Error
        console.error('Erreur lors de la mise à jour du stock:', err)
        return {
            success: false,
            message: err?.message || 'Une erreur est survenue lors de la mise à jour',
        }
    }
}
