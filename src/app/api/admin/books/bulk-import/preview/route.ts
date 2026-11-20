import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { verifyAdmin } from '@/lib/actions/auth'

export const dynamic = 'force-dynamic'

function extractCellValue(val: unknown): string {
    if (val === null || val === undefined) return ''
    if (typeof val === 'string') return val.trim()
    if (typeof val === 'number') return String(val)
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if ('text' in obj && typeof obj.text === 'string') return obj.text.trim()
        if ('result' in obj && obj.result !== undefined && obj.result !== null) {
            return String(obj.result).trim()
        }
        if ('richText' in obj && Array.isArray(obj.richText)) {
            return obj.richText.map((item: { text?: string }) => item.text || '').join('').trim()
        }
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

export interface PreviewRow {
    line: number
    title: string
    lang: string
    price: string
    oldPrice: string
    url: string
    image: string
    stock?: string
    status: 'valid' | 'warning' | 'error'
    message: string
}

export async function POST(request: Request) {
    try {
        await verifyAdmin()

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const importType = formData.get('type') === 'stock' ? 'stock' : 'new'

        if (!file) {
            return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 })
        }

        const fileName = (file.name || '').toLowerCase()
        const rows: PreviewRow[] = []
        let totalRows = 0
        let headers: string[] = []

        if (importType === 'stock') {
            const text = await file.text()
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
            if (lines.length <= 1) {
                return NextResponse.json({ success: false, message: 'Le fichier TSV est vide' }, { status: 400 })
            }
            totalRows = lines.length - 1
            headers = ['Nom', 'Stock']

            for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
                const parts = lines[i].split('\t')
                const title = parts[0]?.trim() || ''
                const stockStr = parts[1]?.trim() || ''
                const stockNum = parseInt(stockStr, 10)

                let status: 'valid' | 'warning' | 'error' = 'valid'
                let message = 'Prêt pour mise à jour'

                if (!title) {
                    status = 'error'
                    message = 'Nom manquant'
                } else if (isNaN(stockNum) || stockNum < 0) {
                    status = 'error'
                    message = 'Stock invalide'
                }

                rows.push({
                    line: i + 1,
                    title,
                    lang: 'fr',
                    price: '',
                    oldPrice: '',
                    url: '',
                    image: '',
                    stock: stockStr,
                    status,
                    message,
                })
            }
        } else if (fileName.endsWith('.csv')) {
            let text = await file.text()
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1)
            }
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
            if (lines.length <= 1) {
                return NextResponse.json({ success: false, message: 'Le fichier CSV est vide' }, { status: 400 })
            }
            totalRows = lines.length - 1
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

            headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())

            for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
                const cols = parseCsvLine(lines[i]).map(c => c.replace(/^["']|["']$/g, '').trim())
                const rowObj: Record<string, unknown> = {}
                headers.forEach((h, idx) => {
                    rowObj[h] = cols[idx] !== undefined ? cols[idx] : ''
                })

                const titleStr = extractCellValue(getField(rowObj, ['nom', 'Nom', 'title', 'Titre', 'name', 'Name']))
                const langRaw = extractCellValue(getField(rowObj, ['lang', 'Lang', 'language', 'langue'])).toLowerCase() || 'fr'
                const priceVal = getField(rowObj, ['prix', 'Prix', 'Prix de vente', 'price', 'Price', 'prix_vente'])
                const parsedPrice = parseNumericValue(priceVal)
                const oldPriceVal = getField(rowObj, ['ancien_prix', 'Ancien_prix', 'ancien prix', 'originalPrice'])
                const urlVal = extractCellValue(getField(rowObj, ['url', 'Url', 'URL', 'link', 'Link']))
                let imageVal = extractCellValue(getField(rowObj, ['image', 'Image', 'photo', 'Photo', 'cover']))

                if (!imageVal && urlVal && /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(urlVal)) {
                    imageVal = urlVal
                }

                let status: 'valid' | 'warning' | 'error' = 'valid'
                let message = 'Prêt'

                if (!titleStr) {
                    status = 'error'
                    message = 'Titre manquant'
                } else if (!priceVal || isNaN(parsedPrice) || parsedPrice <= 0) {
                    status = 'error'
                    message = 'Prix invalide'
                } else if (!imageVal) {
                    status = 'warning'
                    message = 'Image absente (placeholder utilisé)'
                }

                rows.push({
                    line: i + 1,
                    title: titleStr || 'Sans titre',
                    lang: langRaw,
                    price: priceVal !== undefined ? String(priceVal) : '',
                    oldPrice: oldPriceVal !== undefined ? String(oldPriceVal) : '',
                    url: urlVal,
                    image: imageVal,
                    status,
                    message,
                })
            }
        } else {
            // Excel (.xlsx, .xls)
            const arrayBuffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(arrayBuffer as unknown as ExcelJS.Buffer)

            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                return NextResponse.json({ success: false, message: 'Le fichier Excel est vide' }, { status: 400 })
            }

            totalRows = Math.max(0, worksheet.rowCount - 1)
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber - 1] = extractCellValue(cell.value)
            })

            const maxRow = Math.min(6, worksheet.rowCount)
            for (let r = 2; r <= maxRow; r++) {
                const row = worksheet.getRow(r)
                const rowObj: Record<string, unknown> = {}
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber - 1]
                    if (header) rowObj[header] = cell.value
                })

                const titleStr = extractCellValue(getField(rowObj, ['nom', 'Nom', 'title', 'Titre', 'name', 'Name']))
                const langRaw = extractCellValue(getField(rowObj, ['lang', 'Lang', 'language', 'langue'])).toLowerCase() || 'fr'
                const priceVal = getField(rowObj, ['prix', 'Prix', 'Prix de vente', 'price', 'Price', 'prix_vente'])
                const parsedPrice = parseNumericValue(priceVal)
                const oldPriceVal = getField(rowObj, ['ancien_prix', 'Ancien_prix', 'ancien prix', 'originalPrice'])
                const urlVal = extractCellValue(getField(rowObj, ['url', 'Url', 'URL', 'link', 'Link']))
                let imageVal = extractCellValue(getField(rowObj, ['image', 'Image', 'photo', 'Photo', 'cover']))

                if (!imageVal && urlVal && /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(urlVal)) {
                    imageVal = urlVal
                }

                let status: 'valid' | 'warning' | 'error' = 'valid'
                let message = 'Prêt'

                if (!titleStr) {
                    status = 'error'
                    message = 'Titre manquant'
                } else if (!priceVal || isNaN(parsedPrice) || parsedPrice <= 0) {
                    status = 'error'
                    message = 'Prix invalide'
                } else if (!imageVal) {
                    status = 'warning'
                    message = 'Image absente (placeholder utilisé)'
                }

                rows.push({
                    line: r,
                    title: titleStr || 'Sans titre',
                    lang: langRaw,
                    price: priceVal !== undefined ? String(priceVal) : '',
                    oldPrice: oldPriceVal !== undefined ? String(oldPriceVal) : '',
                    url: urlVal,
                    image: imageVal,
                    status,
                    message,
                })
            }
        }

        return NextResponse.json({
            success: true,
            headers,
            rows,
            totalRows,
            importType,
            fileName: file.name,
        })
    } catch (err: unknown) {
        const error = err as Error
        console.error('[BulkImport Preview Error]:', error)
        return NextResponse.json(
            { success: false, message: error?.message || 'Erreur lors de la lecture de l\'aperçu' },
            { status: 500 }
        )
    }
}
