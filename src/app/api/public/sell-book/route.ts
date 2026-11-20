import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { autoClassifyBook } from '@/lib/utils/auto-classifier'

// Configurations
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit for public

export async function POST(request: NextRequest) {
    try {
        // Rate limiting (strict for public forms)
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`sell_book_${ip}`, { limit: 5, windowMs: 3600000 }) // 5 per hour

        if (!limiter.success) {
            return NextResponse.json(
                { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
                { status: 429 }
            )
        }

        const formData = (await request.formData()) as any
        
        // Extract fields
        const title = formData.get('title') as string
        const author = formData.get('author') as string
        const description = formData.get('description') as string
        const category = formData.get('category') as string
        const condition = formData.get('condition') as string
        const priceStr = formData.get('price') as string
        const fullName = formData.get('fullName') as string
        const phone = formData.get('phone') as string
        const file = formData.get('image') as File

        // Basic validation
        if (!title || !author || !condition || !priceStr || !fullName || !phone || !file) {
            return NextResponse.json({ error: 'Tous les champs requis ne sont pas remplis.' }, { status: 400 })
        }

        const price = parseFloat(priceStr)
        if (isNaN(price) || price < 0) {
            return NextResponse.json({ error: 'Prix invalide.' }, { status: 400 })
        }

        if (!['GOOD', 'USED'].includes(condition)) {
            return NextResponse.json({ error: 'État invalide.' }, { status: 400 })
        }

        // Image Validation
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: `Type de fichier non autorisé. Types autorisés : JPG, PNG, WEBP.` }, { status: 400 })
        }

        const fileExtension = path.extname(file.name).toLowerCase()
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            return NextResponse.json({ error: `Extension non autorisée.` }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: `La taille de l'image ne doit pas dépasser 5MB.` }, { status: 400 })
        }

        // Process Image
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        let processedBuffer: Buffer
        try {
            processedBuffer = await sharp(buffer)
                .jpeg({ quality: 80, mozjpeg: true })
                .resize(1000, 1500, { fit: 'inside', withoutEnlargement: true })
                .toBuffer()
        } catch (sharpError) {
            console.error('[SELL-BOOK] Sharp processing failed:', sharpError)
            return NextResponse.json({ error: 'Erreur lors du traitement de l\'image.' }, { status: 500 })
        }

        const sanitizedName = sanitizeFilename(path.basename(file.name, fileExtension))
        const hash = createHash('sha256').update(processedBuffer).update(Date.now().toString()).digest('hex').substring(0, 8)
        const fileName = `user_${hash}_${sanitizedName}.jpg`

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
        await mkdir(uploadDir, { recursive: true })
        const filePath = path.join(uploadDir, fileName)
        
        await writeFile(filePath, processedBuffer)
        const imageUrl = `/uploads/books/${fileName}`

        // Database logic
        // 1. Find or create Customer
        let customer = await prisma.customer.findUnique({
            where: { phone }
        })

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    fullName,
                    phone
                }
            })
        }

        // 2. Auto-classification & Create the Book
        const classification = autoClassifyBook({
            title,
            author,
            description,
            language: 'fr',
            category
        })

        const book = await prisma.book.create({
            data: {
                title,
                author,
                description,
                category: classification.category,
                subCategory: classification.subCategory,
                condition: condition as any,
                price,
                stock: 1, // Only 1 copy for used books usually
                image: imageUrl,
                active: false, // Pending approval
                customerSellerId: customer.id,
                language: 'fr', // Default
            }
        })

        return NextResponse.json({ success: true, bookId: book.id })
    } catch (error: any) {
        console.error('[SELL-BOOK ERROR]', error.message)
        return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 })
    }
}
