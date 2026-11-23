import { requireSellerSession } from '@/lib/server/seller-auth'
import SellerBulkImportClient from './SellerBulkImportClient'

export default async function SellerBulkImportPage({ params }: { params: Promise<{ locale: string }> }) {
    const locale = (await params).locale
    await requireSellerSession(locale)

    return <SellerBulkImportClient />
}
