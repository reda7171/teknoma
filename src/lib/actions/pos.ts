'use server'

import * as internal from '@/lib/server/pos'
import { requireRole } from '@/lib/require-role'

export type { ParsedWhatsAppOrder } from '@/lib/server/pos'

export async function getCustomerByPhone(...args: Parameters<typeof internal.getCustomerByPhone>) {
    await requireRole()
    return internal.getCustomerByPhone(...args)
}

export async function createPOSOrder(...args: Parameters<typeof internal.createPOSOrder>) {
    await requireRole()
    return internal.createPOSOrder(...args)
}

export async function parseWhatsAppOrder(...args: Parameters<typeof internal.parseWhatsAppOrder>) {
    await requireRole()
    return internal.parseWhatsAppOrder(...args)
}
