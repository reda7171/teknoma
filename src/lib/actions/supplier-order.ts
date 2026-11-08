'use server'

import * as internal from '@/lib/server/supplier-order'
import { requireRole } from '@/lib/require-role'

export type { SupplierBookRecommendation } from '@/lib/server/supplier-order'

export async function getSupplierOrderRecommendations(...args: Parameters<typeof internal.getSupplierOrderRecommendations>) {
    await requireRole()
    return internal.getSupplierOrderRecommendations(...args)
}

export async function getStockStats(...args: Parameters<typeof internal.getStockStats>) {
    await requireRole()
    return internal.getStockStats(...args)
}
