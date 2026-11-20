import { NextRequest, NextResponse } from 'next/server'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { getOrCreateLoyaltyAccount, getMaxRedeemablePoints, convertPointsToMAD } from '@/lib/server/loyalty'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const user = await getCommunityUser()
        if (!user) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const subtotal = Number(body.subtotal) || 0

        if (subtotal <= 0) {
            return NextResponse.json({ maxPoints: 0, discountMAD: 0 })
        }

        const account = await getOrCreateLoyaltyAccount(user.id)
        const maxPoints = getMaxRedeemablePoints(subtotal, account.pointsBalance)
        const discountMAD = convertPointsToMAD(maxPoints)

        return NextResponse.json({
            success: true,
            userPointsBalance: account.pointsBalance,
            maxRedeemablePoints: maxPoints,
            discountMAD,
            tier: account.tier
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Erreur lors du calcul des points' },
            { status: 500 }
        )
    }
}
