'use server'

import * as internal from '@/lib/server/warehouse'
import { requireRole } from '@/lib/require-role'

export async function getWarehouses(...args: Parameters<typeof internal.getWarehouses>) {
    await requireRole()
    return internal.getWarehouses(...args)
}

export async function getAllWarehouses(...args: Parameters<typeof internal.getAllWarehouses>) {
    await requireRole()
    return internal.getAllWarehouses(...args)
}

export async function createWarehouse(...args: Parameters<typeof internal.createWarehouse>) {
    await requireRole()
    return internal.createWarehouse(...args)
}

export async function updateWarehouse(...args: Parameters<typeof internal.updateWarehouse>) {
    await requireRole()
    return internal.updateWarehouse(...args)
}

export async function getInventory(...args: Parameters<typeof internal.getInventory>) {
    await requireRole()
    return internal.getInventory(...args)
}

export async function getInventoryByWarehouse(...args: Parameters<typeof internal.getInventoryByWarehouse>) {
    await requireRole()
    return internal.getInventoryByWarehouse(...args)
}

export async function getTotalStock(...args: Parameters<typeof internal.getTotalStock>) {
    await requireRole()
    return internal.getTotalStock(...args)
}

export async function upsertStock(...args: Parameters<typeof internal.upsertStock>) {
    await requireRole()
    return internal.upsertStock(...args)
}

export async function transferStock(...args: Parameters<typeof internal.transferStock>) {
    await requireRole()
    return internal.transferStock(...args)
}

export async function getStockMovements(...args: Parameters<typeof internal.getStockMovements>) {
    await requireRole()
    return internal.getStockMovements(...args)
}

export async function allocateOrderItemStock(...args: Parameters<typeof internal.allocateOrderItemStock>) {
    await requireRole()
    return internal.allocateOrderItemStock(...args)
}

export async function restoreOrderItemStock(...args: Parameters<typeof internal.restoreOrderItemStock>) {
    await requireRole()
    return internal.restoreOrderItemStock(...args)
}
