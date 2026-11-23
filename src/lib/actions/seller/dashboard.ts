'use server'

import { prisma } from '@/lib/prisma'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'
import { autoClassifyBook } from '@/lib/utils/auto-classifier'
import { OrderStatus } from '@prisma/client'
import ExcelJS from 'exceljs'

export type SellerBulkImportResult = {
    success: boolean
    message: string
    imported: number
    failed: number
    errors: string[]
}

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

function parseNumeric(val: unknown): number {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    const str = String(val).replace(/[^0-9.,]/g, '').replace(',', '.')
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : parsed
}

function getColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
    const lowerAliases = aliases.map(a => a.toLowerCase().trim())
    for (const key of Object.keys(row)) {
        if (lowerAliases.includes(key.toLowerCase().trim())) {
            const val = row[key]
            if (val !== undefined && val !== null && val !== '') {
                return val
            }
        }
    }
    return undefined
}

/**
 * Récupère les stats du dashboard vendeur
 */
export async function getSellerDashboardData() {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') throw new Error('Non autorisé')

    const [booksCount, ordersCount, recentOrders] = await Promise.all([
        prisma.book.count({ where: { sellerId: userId } }),
        prisma.order.count({ where: { sellerId: userId } }),
        prisma.order.findMany({
            where: { sellerId: userId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        book: { select: { title: true } }
                    }
                }
            }
        })
    ])

    // Calcul du CA
    const orders = await prisma.order.findMany({
        where: { sellerId: userId, status: 'DELIVERED' },
        select: { total: true }
    })
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

    return {
        booksCount,
        ordersCount,
        recentOrders,
        totalRevenue
    }
}

/**
 * Récupère les livres du vendeur
 */
export async function getSellerBooks() {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') throw new Error('Non autorisé')

    return prisma.book.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Récupère les commandes du vendeur
 */
export async function getSellerOrders() {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') throw new Error('Non autorisé')

    return prisma.order.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: {
                    book: { select: { title: true, image: true, price: true } }
                }
            }
        }
    })
}

/**
 * Créer un livre ( Marketplace )
 */
export async function createSellerBook(data: any) {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') throw new Error('Non autorisé')

    const classification = autoClassifyBook({
        title: data.title,
        author: data.author,
        description: data.description,
        language: data.language,
        category: data.category,
        subCategory: data.subCategory
    })

    const book = await prisma.book.create({
        data: {
            ...data,
            category: classification.category,
            subCategory: classification.subCategory,
            sellerId: userId,
            active: false,
            status: 'PENDING'
        }
    })

    revalidatePath('/seller/books')
    return { success: true, book }
}

/**
 * Mettre à jour l'état d'expédition d'une commande par le vendeur
 */
export async function updateSellerOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    trackingData?: { trackingID?: string; shippingCompany?: string; deliveryNotes?: string }
) {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') throw new Error('Non autorisé')

    // Sécurité OWASP: Vérification que la commande appartient bien à ce vendeur
    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
    })

    if (!existingOrder) {
        throw new Error('Commande introuvable')
    }

    if (existingOrder.sellerId !== userId) {
        throw new Error('Action non autorisée sur cette commande')
    }

    const updatePayload: any = {
        status: newStatus
    }

    if (trackingData?.trackingID !== undefined) {
        updatePayload.trackingID = trackingData.trackingID.trim() || null
    }
    if (trackingData?.shippingCompany !== undefined) {
        updatePayload.shippingCompany = trackingData.shippingCompany.trim() || null
    }
    if (trackingData?.deliveryNotes !== undefined) {
        updatePayload.deliveryNotes = trackingData.deliveryNotes.trim() || null
    }

    if (newStatus === OrderStatus.SHIPPED) {
        updatePayload.deliveryStatus = 'SHIPPED'
        updatePayload.deliverySyncAt = new Date()
    } else if (newStatus === OrderStatus.DELIVERED) {
        updatePayload.deliveryStatus = 'DELIVERED'
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: updatePayload
    })

    revalidatePath('/seller/orders')
    revalidatePath('/seller')
    return { success: true, order: updated }
}

/**
 * Importer un catalogue en masse depuis un fichier Excel ou CSV pour le vendeur
 */
export async function importSellerBooksFromExcel(formData: FormData): Promise<SellerBulkImportResult> {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || role !== 'SELLER') {
        return {
            success: false,
            message: 'Non autorisé',
            imported: 0,
            failed: 0,
            errors: ['Session vendeur invalide ou expirée']
        }
    }

    const file = formData.get('file') as File
    if (!file) {
        return {
            success: false,
            message: 'Aucun fichier sélectionné',
            imported: 0,
            failed: 0,
            errors: ['Veuillez choisir un fichier .xlsx, .xls ou .csv']
        }
    }

    const fileName = (file.name || '').toLowerCase()
    const rawRows: Record<string, unknown>[] = []

    try {
        if (fileName.endsWith('.csv')) {
            let text = await file.text()
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1) // Retrait du BOM UTF-8
            }
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
            if (lines.length <= 1) {
                return {
                    success: false,
                    message: 'Le fichier CSV est vide',
                    imported: 0,
                    failed: 0,
                    errors: ['Le fichier ne contient aucune ligne de données']
                }
            }

            const separator = lines[0].includes(';') ? ';' : ','
            const parseCsvLine = (line: string): string[] => {
                const values: string[] = []
                let current = ''
                let inQuotes = false
                for (let i = 0; i < line.length; i++) {
                    const char = line[i]
                    if (char === '"') inQuotes = !inQuotes
                    else if (char === separator && !inQuotes) {
                        values.push(current.trim())
                        current = ''
                    } else current += char
                }
                values.push(current.trim())
                return values
            }

            const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i]).map(c => c.replace(/^["']|["']$/g, '').trim())
                const rowObj: Record<string, unknown> = {}
                headers.forEach((h, idx) => {
                    rowObj[h] = cols[idx] !== undefined ? cols[idx] : ''
                })
                rawRows.push(rowObj)
            }
        } else {
            // Excel (.xlsx, .xls)
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

            const sheet = workbook.worksheets[0]
            if (!sheet || sheet.rowCount <= 1) {
                return {
                    success: false,
                    message: 'Le fichier Excel est vide',
                    imported: 0,
                    failed: 0,
                    errors: ['La feuille de calcul ne contient aucune ligne de données']
                }
            }

            const headers: string[] = []
            sheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber - 1] = extractCellValue(cell.value)
            })

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return
                const rowObj: Record<string, unknown> = {}
                headers.forEach((h, idx) => {
                    const cell = row.getCell(idx + 1)
                    rowObj[h] = extractCellValue(cell?.value)
                })
                rawRows.push(rowObj)
            })
        }
    } catch (parseError: any) {
        return {
            success: false,
            message: 'Erreur lors de la lecture du fichier',
            imported: 0,
            failed: 0,
            errors: [parseError?.message || 'Format de fichier corrompu ou non supporté']
        }
    }

    if (rawRows.length === 0) {
        return {
            success: false,
            message: 'Aucun livre trouvé dans le fichier',
            imported: 0,
            failed: 0,
            errors: ['Veuillez renseigner au moins une ligne de livre dans le modèle']
        }
    }

    let importedCount = 0
    let failedCount = 0
    const errorDetails: string[] = []

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i]
        const rowNum = i + 2 // Compte tenu de la ligne d'en-tête

        const rawTitle = getColumnValue(row, ['titre', 'title', 'nom', 'name', 'titre *'])
        const rawAuthor = getColumnValue(row, ['auteur', 'author', 'ecrivain', 'auteur *'])
        const rawPrice = getColumnValue(row, ['prix', 'price', 'prix (mad)', 'prix (mad) *', 'prix mad'])
        const rawStock = getColumnValue(row, ['stock', 'quantite', 'quantity', 'stock *'])
        const rawIsbn = getColumnValue(row, ['isbn', 'code-barre', 'barcode'])
        const rawDesc = getColumnValue(row, ['description', 'resume', 'desc'])
        const rawLang = getColumnValue(row, ['langue', 'language', 'lang'])
        const rawImage = getColumnValue(row, ['image', 'couverture', 'image url', 'photo'])

        const title = String(rawTitle || '').trim()
        const author = String(rawAuthor || '').trim()
        const price = parseNumeric(rawPrice)
        const stock = Math.max(0, Math.floor(parseNumeric(rawStock) || 1))
        const isbn = rawIsbn ? String(rawIsbn).trim() : null
        const description = rawDesc ? String(rawDesc).trim() : null
        const language = rawLang ? String(rawLang).toLowerCase().trim() : 'fr'
        const image = rawImage ? String(rawImage).trim() : '/placeholder-book.webp'

        if (!title || !author) {
            failedCount++
            errorDetails.push(`Ligne ${rowNum} : Titre et Auteur obligatoires manquants`)
            continue
        }

        if (price <= 0) {
            failedCount++
            errorDetails.push(`Ligne ${rowNum} ("${title}") : Prix invalide (${price} MAD)`)
            continue
        }

        try {
            const classification = autoClassifyBook({
                title,
                author,
                description: description || undefined,
                language
            })

            await prisma.book.create({
                data: {
                    title,
                    author,
                    price,
                    costPrice: 0,
                    stock,
                    image,
                    isbn,
                    description: description || `Ouvrage proposé par la librairie partenaire. Auteur : ${author}.`,
                    language: ['fr', 'ar', 'en'].includes(language) ? language : 'fr',
                    category: classification.category,
                    subCategory: classification.subCategory,
                    sellerId: userId,
                    active: true,
                    status: 'APPROVED'
                }
            })
            importedCount++
        } catch (dbErr: any) {
            failedCount++
            errorDetails.push(`Ligne ${rowNum} ("${title}") : ${dbErr?.message || 'Erreur d\'insertion en base'}`)
        }
    }

    revalidatePath('/seller/books')
    revalidatePath('/seller')

    return {
        success: importedCount > 0,
        message: `${importedCount} livre(s) importé(s) avec succès${failedCount > 0 ? `, ${failedCount} échoué(s)` : ''}.`,
        imported: importedCount,
        failed: failedCount,
        errors: errorDetails.slice(0, 10)
    }
}

