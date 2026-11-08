import { requirePageRole } from '@/lib/page-authorization'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import SellerPostsApprovalClient from './SellerPostsApprovalClient'

export default async function SellerPostsApprovalPage({ params }: { params: Promise<{ locale: string }> }) {
    await requirePageRole(["ADMIN","MANAGER"])

    const locale = (await params).locale
    const userId = await getAdminUser()
    const role = await getAdminRole()
    if (!userId || !['ADMIN', 'SUPERADMIN'].includes(role || '')) redirect(`/${locale}/admin/login`)

    // Récupère les articles en attente avec infos de l'auteur
    const pendingPosts = await prisma.post.findMany({
        where: { published: false },
        orderBy: { createdAt: 'desc' },
        include: {
            author: { select: { fullName: true, email: true } }
        }
    })

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Articles Vendeurs — Approbation</h1>
                <p className="text-sm text-gray-500 mt-1">{pendingPosts.length} article(s) en attente de modération</p>
            </div>
            <SellerPostsApprovalClient posts={pendingPosts} />
        </div>
    )
}
