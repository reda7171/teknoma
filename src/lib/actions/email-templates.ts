'use server'

import * as internal from '@/lib/server/email-templates'
import { requireRole } from '@/lib/require-role'

export type { AutomatedEmailRule } from '@/lib/server/email-templates'

export async function getEmailTemplates(...args: Parameters<typeof internal.getEmailTemplates>) {
    await requireRole()
    return internal.getEmailTemplates(...args)
}

export async function getEmailTemplate(...args: Parameters<typeof internal.getEmailTemplate>) {
    await requireRole()
    return internal.getEmailTemplate(...args)
}

export async function createEmailTemplate(...args: Parameters<typeof internal.createEmailTemplate>) {
    await requireRole()
    return internal.createEmailTemplate(...args)
}

export async function updateEmailTemplate(...args: Parameters<typeof internal.updateEmailTemplate>) {
    await requireRole()
    return internal.updateEmailTemplate(...args)
}

export async function deleteEmailTemplate(...args: Parameters<typeof internal.deleteEmailTemplate>) {
    await requireRole()
    return internal.deleteEmailTemplate(...args)
}

export async function getAutomatedEmailRules(...args: Parameters<typeof internal.getAutomatedEmailRules>) {
    await requireRole()
    return internal.getAutomatedEmailRules(...args)
}

export async function saveAutomatedEmailRules(...args: Parameters<typeof internal.saveAutomatedEmailRules>) {
    await requireRole()
    return internal.saveAutomatedEmailRules(...args)
}

export async function sendTestEmailTemplate(...args: Parameters<typeof internal.sendTestEmailTemplate>) {
    await requireRole()
    return internal.sendTestEmailTemplate(...args)
}

export async function sendTriggerEmail(...args: Parameters<typeof internal.sendTriggerEmail>) {
    await requireRole()
    return internal.sendTriggerEmail(...args)
}
