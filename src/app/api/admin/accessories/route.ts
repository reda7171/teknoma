import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET(request: NextRequest) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        const accessories = await prisma.extraProduct.findMany({
            where: category ? { category: category.toUpperCase() } : undefined,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(accessories)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const data = await request.json()

        const accessory = await prisma.extraProduct.create({
            data: {
                name: data.name,
                description: data.description,
                price: parseFloat(data.price),
                costPrice: parseFloat(data.costPrice || 0),
                stock: parseInt(data.stock || 0),
                image: data.image || (data.images && data.images[0]) || '',
                images: data.images || [],
                category: data.category || 'ACCESSORY',
                materials: data.materials,
                dimensions: data.dimensions,
                weight: data.weight,
                warranty: data.warranty,
                sellerSku: data.sellerSku,
                active: data.active !== undefined ? data.active : true,
                jumiaHighlights: data.jumiaHighlights,
                jumiaPackageContent: data.jumiaPackageContent,
                isSyncedWithJumia: data.isSyncedWithJumia || false,
                jumiaPriceMarkup: data.jumiaPriceMarkup !== undefined ? parseFloat(data.jumiaPriceMarkup) : 0,
                jumiaProductSid: data.jumiaProductSid,
                jumiaStock: data.jumiaStock !== undefined ? parseInt(data.jumiaStock) : undefined,
                videos: data.videos !== undefined ? data.videos : undefined,
                isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : false
            }
        })

        try {
            const { revalidatePath } = require('next/cache')
            revalidatePath('/[locale]/admin/accessories', 'page')
            revalidatePath('/[locale]/admin/accessories/library', 'page')
            revalidatePath('/[locale]/admin/accessories/usb', 'page')
            revalidatePath('/[locale]/admin/accessories/bookmarks', 'page')
            revalidatePath('/[locale]/admin/accessories/kids', 'page')
        } catch (e) {
            console.error(e)
        }

        return NextResponse.json(accessory)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
