import PostForm from '@/components/admin/PostForm'
import { getPostById } from '@/lib/actions/blog'
import { notFound } from 'next/navigation'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    
    if (id === 'new') {
        return (
            <div className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center md:text-left mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">Nouvel Article</h1>
                    <p className="text-gray-500 font-medium text-lg">Rédigez un chef-d'œuvre avec l'éditeur premium</p>
                </div>
                <PostForm />
            </div>
        )
    }

    const post = await getPostById(id)

    if (!post) {
        notFound()
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-[#0f0f0f] tracking-tight mb-3">Modifier l'article</h1>
                    <p className="text-gray-500 font-medium text-lg">Mettez à jour le contenu de votre article avec l'éditeur premium</p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-sm min-w-[140px]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score SEO</span>
                    <span className={`text-3xl font-black ${
                        ((post as any).seoScore || 0) >= 80 ? 'text-green-500' :
                        ((post as any).seoScore || 0) >= 50 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                        {((post as any).seoScore || 0)}
                        <span className="text-sm text-gray-400 ml-1">/100</span>
                    </span>
                </div>
            </div>

            <PostForm post={post} isEditing />
        </div>
    )
}
