import { SalesChannel } from '@prisma/client'

const TEKNO_MA_HOSTS = new Set(['tekno.ma', 'tekno.ma'])

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

    return TEKNO_MA_HOSTS.has(host)
        ? SalesChannel.TEKNO_MA
        : SalesChannel.TEKNO_STORE
}

const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
    [SalesChannel.TEKNO_STORE]: 'Tekno Store Store',
    [SalesChannel.TEKNO_MA]: 'tekno.ma',
    [SalesChannel.ADMIN_POS]: 'Caisse / POS',
    [SalesChannel.MOBILE_APP]: 'Application mobile',
    [SalesChannel.ADMIN_IMPORT]: 'Import administratif'
}

export function getSalesChannelLabel(channel: SalesChannel | string | null | undefined): string {
    if (!channel) return SALES_CHANNEL_LABELS[SalesChannel.TEKNO_STORE]
    return SALES_CHANNEL_LABELS[channel as SalesChannel] || channel
}
