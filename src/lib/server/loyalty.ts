import { prisma } from '@/lib/prisma'
import { LoyaltyTier, LoyaltyTransactionType } from '@prisma/client'

// Constantes du programme de fidélité inspiré d'Oraimo
export const LOYALTY_CONFIG = {
    POINTS_PER_MAD: 1, // 1 MAD dépensé = 1 point
    CONVERSION_RATE: 0.05, // 100 points = 5 MAD (1 pt = 0.05 MAD)
    POINTS_FOR_ONE_MAD: 20, // 20 points = 1 MAD
    MAX_DISCOUNT_PERCENT: 25, // Maximum 25% du sous-total payable en points
    MIN_POINTS_TO_REDEEM: 100, // Seuil minimum pour utiliser ses points
    WELCOME_BONUS_POINTS: 50, // Bonus de bienvenue à l'inscription
    REVIEW_BONUS_POINTS: 20, // Bonus avis vérifié
    TIERS: {
        BRONZE: {
            name: 'Bronze',
            minPoints: 0,
            multiplier: 1.0,
            perks: ['1 MAD = 1 Point', 'Accès aux offres membres']
        },
        SILVER: {
            name: 'Silver',
            minPoints: 500,
            multiplier: 1.2,
            perks: ['Points x1.2 (+20% bonus)', '1 marque-page offert par commande']
        },
        GOLD: {
            name: 'Gold',
            minPoints: 1500,
            multiplier: 1.5,
            perks: ['Points x1.5 (+50% bonus)', 'Livraison gratuite dès 200 MAD', 'Cadeau surprise']
        },
        PLATINUM: {
            name: 'Platinum',
            minPoints: 3000,
            multiplier: 2.0,
            perks: ['Points x2.0 (Points doublés)', 'Livraison prioritaire gratuite', 'Ventes privées exclusives']
        }
    }
}

/**
 * Calcule le niveau VIP basé sur les points cumulés à vie
 */
export function calculateTier(lifetimePoints: number): LoyaltyTier {
    if (lifetimePoints >= LOYALTY_CONFIG.TIERS.PLATINUM.minPoints) return LoyaltyTier.PLATINUM
    if (lifetimePoints >= LOYALTY_CONFIG.TIERS.GOLD.minPoints) return LoyaltyTier.GOLD
    if (lifetimePoints >= LOYALTY_CONFIG.TIERS.SILVER.minPoints) return LoyaltyTier.SILVER
    return LoyaltyTier.BRONZE
}

/**
 * Récupère le multiplicateur de points selon le palier VIP
 */
export function getTierMultiplier(tier: LoyaltyTier): number {
    return LOYALTY_CONFIG.TIERS[tier]?.multiplier || 1.0
}

/**
 * Convertit un nombre de points en valeur MAD
 */
export function convertPointsToMAD(points: number): number {
    if (points <= 0) return 0
    return Math.floor(points * LOYALTY_CONFIG.CONVERSION_RATE * 100) / 100
}

/**
 * Calcule le nombre maximal de points utilisables pour un montant donné
 */
export function getMaxRedeemablePoints(subtotalMAD: number, userPoints: number): number {
    if (subtotalMAD <= 0 || userPoints < LOYALTY_CONFIG.MIN_POINTS_TO_REDEEM) return 0
    const maxDiscountMAD = (subtotalMAD * LOYALTY_CONFIG.MAX_DISCOUNT_PERCENT) / 100
    const maxPointsAllowed = Math.floor(maxDiscountMAD * LOYALTY_CONFIG.POINTS_FOR_ONE_MAD)
    const pointsCapped = Math.min(userPoints, maxPointsAllowed)
    // Arrondir par multiples de 20 points (soit 1 MAD)
    return Math.floor(pointsCapped / LOYALTY_CONFIG.POINTS_FOR_ONE_MAD) * LOYALTY_CONFIG.POINTS_FOR_ONE_MAD
}

/**
 * Récupère ou initialise le compte de fidélité d'un utilisateur
 */
export async function getOrCreateLoyaltyAccount(userId: string) {
    let account = await prisma.loyaltyAccount.findUnique({
        where: { userId },
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    })

    if (!account) {
        account = await prisma.loyaltyAccount.create({
            data: {
                userId,
                pointsBalance: LOYALTY_CONFIG.WELCOME_BONUS_POINTS,
                lifetimePoints: LOYALTY_CONFIG.WELCOME_BONUS_POINTS,
                tier: LoyaltyTier.BRONZE,
                transactions: {
                    create: {
                        type: LoyaltyTransactionType.BONUS,
                        points: LOYALTY_CONFIG.WELCOME_BONUS_POINTS,
                        balanceAfter: LOYALTY_CONFIG.WELCOME_BONUS_POINTS,
                        description: 'Bonus de bienvenue Riwaya'
                    }
                }
            },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        })
    }

    return account
}

/**
 * Attribue les points après livraison d'une commande (statut DELIVERED)
 */
export async function awardOrderPoints(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true }
    })

    if (!order || !order.customerId) return null

    // Vérifier si la commande a déjà été créditée
    const existingAward = await prisma.loyaltyTransaction.findFirst({
        where: {
            orderId,
            type: LoyaltyTransactionType.EARNED
        }
    })

    if (existingAward) return null

    const account = await getOrCreateLoyaltyAccount(order.customerId)
    const multiplier = getTierMultiplier(account.tier)
    const eligibleAmount = Math.max(0, (order.subtotal || order.total) - (order.pointsDiscount || 0))
    const earnedPoints = Math.round(eligibleAmount * LOYALTY_CONFIG.POINTS_PER_MAD * multiplier)

    if (earnedPoints <= 0) return null

    const newBalance = account.pointsBalance + earnedPoints
    const newLifetime = account.lifetimePoints + earnedPoints
    const newTier = calculateTier(newLifetime)

    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.loyaltyTransaction.create({
            data: {
                accountId: account.id,
                orderId: order.id,
                type: LoyaltyTransactionType.EARNED,
                points: earnedPoints,
                balanceAfter: newBalance,
                description: `Points commande #${order.id.slice(0, 8)} (${account.tier} x${multiplier})`
            }
        })

        await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
                pointsBalance: newBalance,
                lifetimePoints: newLifetime,
                tier: newTier,
                tierUpdatedAt: newTier !== account.tier ? new Date() : account.tierUpdatedAt
            }
        })

        await tx.order.update({
            where: { id: order.id },
            data: { pointsEarned: earnedPoints }
        })

        return transaction
    })
}

/**
 * Déduit les points lors de l'utilisation au checkout
 */
export async function redeemPointsForOrder(userId: string, orderId: string, pointsToRedeem: number) {
    if (pointsToRedeem < LOYALTY_CONFIG.MIN_POINTS_TO_REDEEM) return null

    const account = await prisma.loyaltyAccount.findUnique({
        where: { userId }
    })

    if (!account || account.pointsBalance < pointsToRedeem) {
        throw new Error('Solde de points insuffisant')
    }

    const discountMAD = convertPointsToMAD(pointsToRedeem)
    const newBalance = account.pointsBalance - pointsToRedeem

    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.loyaltyTransaction.create({
            data: {
                accountId: account.id,
                orderId,
                type: LoyaltyTransactionType.REDEEMED,
                points: -pointsToRedeem,
                balanceAfter: newBalance,
                description: `Réduction de ${discountMAD} MAD sur commande #${orderId.slice(0, 8)}`
            }
        })

        await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: { pointsBalance: newBalance }
        })

        await tx.order.update({
            where: { id: orderId },
            data: {
                pointsUsed: pointsToRedeem,
                pointsDiscount: discountMAD
            }
        })

        return transaction
    })
}

/**
 * Rembourse les points utilisés en cas d'annulation ou retour
 */
export async function refundOrderPoints(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { loyaltyTransactions: true }
    })

    if (!order || !order.customerId) return null

    const account = await prisma.loyaltyAccount.findUnique({
        where: { userId: order.customerId }
    })

    if (!account) return null

    return await prisma.$transaction(async (tx) => {
        // Recréditer les points dépensés s'il y en a
        if (order.pointsUsed > 0) {
            const newBalance = account.pointsBalance + order.pointsUsed
            await tx.loyaltyTransaction.create({
                data: {
                    accountId: account.id,
                    orderId: order.id,
                    type: LoyaltyTransactionType.REFUNDED,
                    points: order.pointsUsed,
                    balanceAfter: newBalance,
                    description: `Remboursement points suite annulation commande #${order.id.slice(0, 8)}`
                }
            })
            await tx.loyaltyAccount.update({
                where: { id: account.id },
                data: { pointsBalance: newBalance }
            })
        }

        // Annuler les points gagnés si la commande avait été livrée puis retournée
        if (order.pointsEarned > 0) {
            const currentAccount = await tx.loyaltyAccount.findUnique({ where: { id: account.id } })
            const adjustedBalance = Math.max(0, (currentAccount?.pointsBalance || 0) - order.pointsEarned)
            const adjustedLifetime = Math.max(0, (currentAccount?.lifetimePoints || 0) - order.pointsEarned)
            const adjustedTier = calculateTier(adjustedLifetime)

            await tx.loyaltyTransaction.create({
                data: {
                    accountId: account.id,
                    orderId: order.id,
                    type: LoyaltyTransactionType.ADJUSTMENT,
                    points: -order.pointsEarned,
                    balanceAfter: adjustedBalance,
                    description: `Annulation des points gagnés sur commande #${order.id.slice(0, 8)}`
                }
            })

            await tx.loyaltyAccount.update({
                where: { id: account.id },
                data: {
                    pointsBalance: adjustedBalance,
                    lifetimePoints: adjustedLifetime,
                    tier: adjustedTier
                }
            })
        }
    })
}

/**
 * Fournit un résumé complet du profil fidélité pour le client
 */
export async function getLoyaltySummary(userId: string) {
    const account = await getOrCreateLoyaltyAccount(userId)
    const currentTier = account.tier
    const tierConfig = LOYALTY_CONFIG.TIERS[currentTier]

    // Prochain palier et points manquants
    let nextTier: { name: string; minPoints: number; pointsNeeded: number; progress: number } | null = null

    if (currentTier === LoyaltyTier.BRONZE) {
        const target = LOYALTY_CONFIG.TIERS.SILVER.minPoints
        const needed = Math.max(0, target - account.lifetimePoints)
        const progress = Math.min(100, Math.round((account.lifetimePoints / target) * 100))
        nextTier = { name: 'Silver', minPoints: target, pointsNeeded: needed, progress }
    } else if (currentTier === LoyaltyTier.SILVER) {
        const start = LOYALTY_CONFIG.TIERS.SILVER.minPoints
        const target = LOYALTY_CONFIG.TIERS.GOLD.minPoints
        const needed = Math.max(0, target - account.lifetimePoints)
        const progress = Math.min(100, Math.round(((account.lifetimePoints - start) / (target - start)) * 100))
        nextTier = { name: 'Gold', minPoints: target, pointsNeeded: needed, progress }
    } else if (currentTier === LoyaltyTier.GOLD) {
        const start = LOYALTY_CONFIG.TIERS.GOLD.minPoints
        const target = LOYALTY_CONFIG.TIERS.PLATINUM.minPoints
        const needed = Math.max(0, target - account.lifetimePoints)
        const progress = Math.min(100, Math.round(((account.lifetimePoints - start) / (target - start)) * 100))
        nextTier = { name: 'Platinum', minPoints: target, pointsNeeded: needed, progress }
    }

    return {
        pointsBalance: account.pointsBalance,
        lifetimePoints: account.lifetimePoints,
        pointsValueMAD: convertPointsToMAD(account.pointsBalance),
        tier: currentTier,
        multiplier: tierConfig.multiplier,
        perks: tierConfig.perks,
        nextTier,
        recentTransactions: account.transactions
    }
}
