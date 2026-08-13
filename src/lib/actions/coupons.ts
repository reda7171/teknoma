'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath } from 'next/cache'
import { CouponType } from '@prisma/client'

export async function getCoupons() {
  await verifyAdmin()
  
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    // Stats for dashboard
    const total = coupons.length
    const active = coupons.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length
    const affiliate = coupons.filter(c => c.isAffiliate).length
    
    return {
      success: true,
      data: coupons,
      stats: { total, active, affiliate }
    }
  } catch (error) {
    console.error('[COUPONS_GET_ERROR]', error)
    return { success: false, error: 'Impossible de récupérer les coupons' }
  }
}

export type CouponInput = {
  code: string
  discount: number
  type: CouponType
  minAmount?: number | null
  expiresAt?: string | null
}

export async function createCoupon(data: CouponInput) {
  await verifyAdmin()
  
  try {
    // Check if code exists
    const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } })
    if (existing) {
      return { success: false, error: 'Ce code promo existe déjà' }
    }
    
    await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discount: data.discount,
        type: data.type,
        minAmount: data.minAmount || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }
    })
    
    revalidatePath('/[locale]/admin/coupons', 'page')
    return { success: true }
  } catch (error) {
    console.error('[COUPON_CREATE_ERROR]', error)
    return { success: false, error: 'Erreur lors de la création du coupon' }
  }
}

export async function deleteCoupon(id: string) {
  await verifyAdmin()
  
  try {
    await prisma.coupon.delete({ where: { id } })
    revalidatePath('/[locale]/admin/coupons', 'page')
    return { success: true }
  } catch (error) {
    console.error('[COUPON_DELETE_ERROR]', error)
    return { success: false, error: 'Erreur lors de la suppression du coupon' }
  }
}

export async function toggleCouponStatus(id: string, isActive: boolean) {
  await verifyAdmin()
  
  try {
    await prisma.coupon.update({
      where: { id },
      data: { isActive }
    })
    revalidatePath('/[locale]/admin/coupons', 'page')
    return { success: true }
  } catch (error) {
    console.error('[COUPON_TOGGLE_ERROR]', error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

export async function validateCoupon(code: string, cartTotal: number) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!coupon) {
      return { success: false, error: 'Code promo invalide' }
    }

    if (!coupon.isActive) {
      return { success: false, error: 'Ce code promo est inactif' }
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { success: false, error: 'Ce code promo a expiré' }
    }

    if (coupon.minAmount && cartTotal < coupon.minAmount) {
      return { success: false, error: `Le montant minimum pour ce code est de ${coupon.minAmount} MAD` }
    }

    return { success: true, coupon }
  } catch (error) {
    console.error('[COUPON_VALIDATE_ERROR]', error)
    return { success: false, error: 'Erreur lors de la validation du coupon' }
  }
}
