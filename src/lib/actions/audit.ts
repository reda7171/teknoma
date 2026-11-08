'use server'

import * as internal from '@/lib/server/audit'
import { requireRole } from '@/lib/require-role'

export type { AuditEntity } from '@/lib/server/audit'

export async function createAuditLog(...args: Parameters<typeof internal.createAuditLog>) {
    await requireRole()
    return internal.createAuditLog(...args)
}

export async function getAuditLogs(...args: Parameters<typeof internal.getAuditLogs>) {
    await requireRole()
    return internal.getAuditLogs(...args)
}
