type SellableProduct = {
    stock?: number | null
    active?: boolean | null
    inventories?: Array<{
        quantity: number | null | undefined
        warehouse?: { active?: boolean | null } | null
    }> | null
}

export function getSellableStock(product: SellableProduct): number {
    if (product.active === false) return 0

    const activeInventories = product.inventories?.filter(inventory => inventory.warehouse?.active !== false)
    const rawStock = activeInventories?.length
        ? activeInventories.reduce((total, inventory) => total + Number(inventory.quantity ?? 0), 0)
        : product.stock
    const stock = Number(rawStock ?? 0)
    if (!Number.isFinite(stock)) return 0

    return Math.max(0, Math.floor(stock))
}

export function isProductInStock(product: SellableProduct): boolean {
    return getSellableStock(product) > 0
}

export function getSchemaAvailability(product: SellableProduct): 'https://schema.org/InStock' | 'https://schema.org/OutOfStock' {
    return isProductInStock(product)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock'
}

export function getGoogleAvailability(product: SellableProduct): 'in_stock' | 'out_of_stock' {
    return isProductInStock(product) ? 'in_stock' : 'out_of_stock'
}
