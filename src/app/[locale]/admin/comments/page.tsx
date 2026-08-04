import { getAllComments } from '@/lib/actions/comments'
import { MessageSquare } from 'lucide-react'
import CommentsTable from './CommentsTable'

export const metadata = {
    title: 'Modération des Commentaires | Admin Riwaya',
}

export default async function AdminCommentsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const sp = await searchParams
    const page = parseInt(sp.page || '1')
    const { comments, pagination } = await getAllComments(page)

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-black tracking-tight">Modération</h1>
                    <p className="text-sm text-gray-500 font-medium">Gérez les commentaires de vos articles de blog</p>
                </div>
            </div>

            <CommentsTable comments={comments} />
        </div>
    )
}
