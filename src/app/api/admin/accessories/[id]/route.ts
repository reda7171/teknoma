import { NextResponse, NextRequest } from 'next/server'
import { RETIRED_ACCESSORY_CATEGORIES, isRetiredAccessoryCategory } from '@/lib/pets-catalog'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await verifyAdmin()
        const { id } = await params
        const accessory = await prisma.extraProduct.findUnique({
            where: { id }
        })
        if (!accessory) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(accessory)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await verifyAdmin()
        const { id } = await params
        const data = await request.json()

        if (isRetiredAccessoryCategory(data.category)) return NextResponse.json({ error: 'Catégorie supprimée de PetsUnivers' }, { status: 400 })
        const accessory = await prisma.extraProduct.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                price: data.price !== undefined ? parseFloat(data.price) : undefined,
                costPrice: data.costPrice !== undefined ? parseFloat(data.costPrice) : undefined,
                stock: data.stock !== undefined ? parseInt(data.stock) : undefined,
                image: data.image !== undefined ? data.image : (data.images && data.images.length > 0 ? data.images[0] : undefined),
                images: data.images !== undefined ? data.images : undefined,
                category: data.category,
                materials: data.materials,
                dimensions: data.dimensions,
                weight: data.weight,
                warranty: data.warranty,
                sellerSku: data.sellerSku,
                active: data.active,
                jumiaHighlights: data.jumiaHighlights,
                jumiaPackageContent: data.jumiaPackageContent,
                isSyncedWithJumia: data.isSyncedWithJumia,
                jumiaPriceMarkup: data.jumiaPriceMarkup !== undefined ? parseFloat(data.jumiaPriceMarkup) : undefined,
                jumiaProductSid: data.jumiaProductSid,
                jumiaStock: data.jumiaStock !== undefined ? parseInt(data.jumiaStock) : undefined,
                videos: data.videos !== undefined ? data.videos : undefined,
                isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : undefined
            }
        })

        try {
            const { revalidatePath } = require('next/cache')
            revalidatePath('/[locale]/admin/accessories', 'page')
        } catch (e) {
            console.error(e)
        }

        return NextResponse.json(accessory)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await verifyAdmin()
        const { id } = await params
        await prisma.extraProduct.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
