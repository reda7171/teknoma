import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await verifyAdmin()
        const params = await context.params
        const { id } = params

        await prisma.pushCampaign.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[DELETE PUSH CAMPAIGN]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
