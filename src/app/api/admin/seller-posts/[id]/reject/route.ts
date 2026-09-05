import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Rejeter (supprimer) un article vendeur
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.post.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('reject seller post:', error)
        return NextResponse.json({ error: 'Erreur' }, { status: 500 })
    }
}
