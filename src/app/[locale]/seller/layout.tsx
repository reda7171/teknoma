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
        const commUserId = await getCommunityUser()
        if (commUserId) {
            const user = await prisma.user.findUnique({ where: { id: commUserId } })
            if (user && user.role === 'SELLER') {
                userId = commUserId
                role = 'SELLER'
            }
        }
    }

    if (!userId || role !== 'SELLER') {
        redirect(`/${locale}/admin/login`)
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        redirect(`/${locale}/admin/login`)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <SellerSidebar user={user} />
            
            {/* Main Content (Like Admin) */}
            <div className="pl-64 flex-grow">
                <main className="p-8 mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
