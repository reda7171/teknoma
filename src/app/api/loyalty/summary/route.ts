import { NextResponse } from 'next/server'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { getLoyaltySummary } from '@/lib/server/loyalty'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const user = await getCommunityUser()
        if (!user) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        const summary = await getLoyaltySummary(user.id)
        return NextResponse.json({ success: true, data: summary })
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Erreur lors de la récupération des points fidélité' },
            { status: 500 }
        )
    }
}
