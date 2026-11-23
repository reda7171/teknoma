import { requireSellerSession } from '@/lib/server/seller-auth'
import SellerSidebar from '@/components/seller/SellerSidebar'

export default async function SellerLayout({
    children,
    params
}: {
    children: React.ReactNode,
    params: Promise<{ locale: string }>
}) {
    const locale = (await params).locale
    const session = await requireSellerSession(locale)

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <SellerSidebar user={session.user as any} />

            {/* Main Content — padding seulement sur desktop */}
            <div className={`${locale === 'ar' ? 'md:pr-64' : 'md:pl-64'} flex-grow`}>
                <main className="p-4 md:p-8 mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
