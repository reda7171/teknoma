import { SalesChannel } from '@prisma/client'

const RIWAYA_MA_HOSTS = new Set(['riwaya.ma', 'www.riwaya.ma'])

function normalizeHost(value: string | null | undefined): string {
    if (!value) return ''

    const firstValue = value.split(',')[0]?.trim().toLowerCase() || ''

    try {
        return new URL(firstValue.includes('://') ? firstValue : `https://${firstValue}`).hostname
    } catch {
        return firstValue.split(':')[0] || ''
    }
}

/**
 * Resolves the public storefront from server-controlled request metadata.
 * Unknown and local hosts deliberately fall back to the existing storefront.
 */
export function resolveStorefrontChannel(requestHeaders: Pick<Headers, 'get'>): SalesChannel {
    const host = normalizeHost(
        requestHeaders.get('x-forwarded-host') ||
        requestHeaders.get('host') ||
        requestHeaders.get('origin')
    )

    return RIWAYA_MA_HOSTS.has(host)
        ? SalesChannel.RIWAYA_MA
        : SalesChannel.RIWAYA_STORE
}

const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
    [SalesChannel.RIWAYA_STORE]: 'Riwaya Store',
    [SalesChannel.RIWAYA_MA]: 'Riwaya.ma',
    [SalesChannel.ADMIN_POS]: 'Caisse / POS',
    [SalesChannel.MOBILE_APP]: 'Application mobile',
    [SalesChannel.ADMIN_IMPORT]: 'Import administratif'
}

export function getSalesChannelLabel(channel: SalesChannel | string | null | undefined): string {
    if (!channel) return SALES_CHANNEL_LABELS[SalesChannel.RIWAYA_STORE]
    return SALES_CHANNEL_LABELS[channel as SalesChannel] || channel
}
