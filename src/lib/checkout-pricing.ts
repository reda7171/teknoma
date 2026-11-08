import 'server-only'
import { prisma } from '@/lib/prisma'

type Line = { productId: string; type: 'BOOK' | 'PACK' | 'ACCESSORY' | 'DIGITAL' | 'GIFT'; quantity: number; price: number }

export async function priceCheckoutItems<T extends Line>(items: T[]): Promise<T[]> {
    if (!items.length || items.every(i => i.type === 'GIFT') || items.filter(i => i.type === 'GIFT').length > 1) throw new Error('Panier invalide')
    const ids = (type: Line['type']) => [...new Set(items.filter(i => i.type === type).map(i => i.productId))]
    const [books, packs, accessories, digital, gifts] = await Promise.all([
        prisma.book.findMany({ where: { id: { in: ids('BOOK') }, active: true, status: 'APPROVED' }, select: { id: true, price: true } }),
        prisma.pack.findMany({ where: { id: { in: ids('PACK') }, active: true }, select: { id: true, price: true } }),
        prisma.extraProduct.findMany({ where: { id: { in: ids('ACCESSORY') }, active: true }, select: { id: true, price: true } }),
        prisma.digitalProduct.findMany({ where: { id: { in: ids('DIGITAL') }, active: true }, select: { id: true, price: true } }),
        prisma.gift.findMany({ where: { id: { in: ids('GIFT') }, active: true }, select: { id: true, price: true, minAmount: true } }),
    ])
    const groups = { BOOK: books, PACK: packs, ACCESSORY: accessories, DIGITAL: digital, GIFT: gifts }
    const priced = items.map(item => {
        const product = groups[item.type].find(p => p.id === item.productId)
        if (!product || !Number.isFinite(product.price) || product.price < 0) throw new Error('Produit indisponible')
        return { ...item, price: product.price }
    })
    const subtotal = priced.filter(i => i.type !== 'GIFT').reduce((sum, i) => sum + i.quantity * i.price, 0)
    for (const item of priced.filter(i => i.type === 'GIFT')) {
        const gift = gifts.find(g => g.id === item.productId)!
        if (item.quantity !== 1 || subtotal < gift.minAmount) throw new Error('Cadeau non disponible')
    }
    return priced
}

export async function couponDiscount(code: string | undefined, subtotal: number) {
    if (!code) return 0
    const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } })
    if (!coupon?.isActive || (coupon.expiresAt && coupon.expiresAt < new Date()) ||
        (coupon.minAmount && subtotal < coupon.minAmount) || !Number.isFinite(coupon.discount) || coupon.discount < 0) throw new Error('Code promo invalide')
    const value = coupon.type === 'PERCENTAGE' ? subtotal * Math.min(100, coupon.discount) / 100 : coupon.discount
    return Math.min(subtotal, Math.round(value * 100) / 100)
}
