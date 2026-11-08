'use server'

import * as internal from '@/lib/server/customers'
import { requireRole } from '@/lib/require-role'

export async function createCustomer(...args: Parameters<typeof internal.createCustomer>) {
    await requireRole()
    return internal.createCustomer(...args)
}

export async function updateCustomer(...args: Parameters<typeof internal.updateCustomer>) {
    await requireRole()
    return internal.updateCustomer(...args)
}

export async function deleteCustomer(...args: Parameters<typeof internal.deleteCustomer>) {
    await requireRole()
    return internal.deleteCustomer(...args)
}
