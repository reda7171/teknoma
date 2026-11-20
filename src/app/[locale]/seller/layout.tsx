import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { redirect } from 'next/navigation'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { prisma } from '@/lib/prisma'

export default async function SellerLayout({
    children,
    params
}: {
    children: React.ReactNode,
    params: Promise<{ locale: string }>
}) {
    const locale = (await params).locale
    let userId = await getAdminUser()
    let role = await getAdminRole()

    if (!userId || role !== 'SELLER') {
        const commUser = await getCommunityUser()
        if (commUser) {
            const commId = typeof commUser === 'string' ? commUser : (commUser as any).id
            const user = await prisma.user.findUnique({ where: { id: commId } })
            if (user && user.role === 'SELLER') {
                userId = commId
                role = 'SELLER'
            }
        }
    }

    if (!userId || role !== 'SELLER') {
        redirect(`/${locale}/admin/login`)
    }

    const user = await prisma.user.findUnique({
        where: { id: userId as string }
    })

    if (!user) {
        redirect(`/${locale}/admin/login`)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <SellerSidebar user={user} />

            {/* Main Content — padding seulement sur desktop */}
            <div className={`${locale === 'ar' ? 'md:pr-64' : 'md:pl-64'} flex-grow`}>
                <main className="p-4 md:p-8 mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
