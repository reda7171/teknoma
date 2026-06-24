import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await verifyAdmin()
        await prisma.scheduledPost.delete({
            where: { id: params.id }
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
