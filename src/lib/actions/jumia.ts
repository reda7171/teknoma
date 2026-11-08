'use server'

import * as internal from '@/lib/server/jumia'
import { requireRole } from '@/lib/require-role'

export async function fetchPaidPayoutStatements(...args: Parameters<typeof internal.fetchPaidPayoutStatements>) {
    await requireRole()
    return internal.fetchPaidPayoutStatements(...args)
}

export async function syncBooksStockToJumia(...args: Parameters<typeof internal.syncBooksStockToJumia>) {
    await requireRole()
    return internal.syncBooksStockToJumia(...args)
}

export async function syncBooksQuantityToJumia(...args: Parameters<typeof internal.syncBooksQuantityToJumia>) {
    await requireRole()
    return internal.syncBooksQuantityToJumia(...args)
}

export async function resyncCleanJumiaSellerSku(...args: Parameters<typeof internal.resyncCleanJumiaSellerSku>) {
    await requireRole()
    return internal.resyncCleanJumiaSellerSku(...args)
}

export async function publishBooksToJumia(...args: Parameters<typeof internal.publishBooksToJumia>) {
    await requireRole()
    return internal.publishBooksToJumia(...args)
}

export async function publishPacksToJumia(...args: Parameters<typeof internal.publishPacksToJumia>) {
    await requireRole()
    return internal.publishPacksToJumia(...args)
}

export async function publishAccessoriesToJumia(...args: Parameters<typeof internal.publishAccessoriesToJumia>) {
    await requireRole()
    return internal.publishAccessoriesToJumia(...args)
}

export async function checkJumiaAvailability(...args: Parameters<typeof internal.checkJumiaAvailability>) {
    await requireRole()
    return internal.checkJumiaAvailability(...args)
}

export async function verifyJumiaSku(...args: Parameters<typeof internal.verifyJumiaSku>) {
    await requireRole()
    return internal.verifyJumiaSku(...args)
}

export async function verifyBulkBooksJumiaSku(...args: Parameters<typeof internal.verifyBulkBooksJumiaSku>) {
    await requireRole()
    return internal.verifyBulkBooksJumiaSku(...args)
}

export async function checkJumiaLinkBySku(...args: Parameters<typeof internal.checkJumiaLinkBySku>) {
    await requireRole()
    return internal.checkJumiaLinkBySku(...args)
}

export async function checkJumiaLinkBySkuExact(...args: Parameters<typeof internal.checkJumiaLinkBySkuExact>) {
    await requireRole()
    return internal.checkJumiaLinkBySkuExact(...args)
}

export async function syncJumiaStockForBooksBackground(...args: Parameters<typeof internal.syncJumiaStockForBooksBackground>) {
    await requireRole()
    return internal.syncJumiaStockForBooksBackground(...args)
}

export async function deactivatePackOnJumia(...args: Parameters<typeof internal.deactivatePackOnJumia>) {
    await requireRole()
    return internal.deactivatePackOnJumia(...args)
}

export async function checkPackJumiaCompositionDuplicate(...args: Parameters<typeof internal.checkPackJumiaCompositionDuplicate>) {
    await requireRole()
    return internal.checkPackJumiaCompositionDuplicate(...args)
}
