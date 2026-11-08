'use server'

import * as internal from '@/lib/server/followUp'
import { requireRole } from '@/lib/require-role'

export async function getFollowUpData(...args: Parameters<typeof internal.getFollowUpData>) {
    await requireRole()
    return internal.getFollowUpData(...args)
}

export async function incrementFollowUp(...args: Parameters<typeof internal.incrementFollowUp>) {
    await requireRole()
    return internal.incrementFollowUp(...args)
}
