import { requirePageRole } from '@/lib/page-authorization'
import PostForm from '@/components/admin/PostForm'
import { getPostById } from '@/lib/actions/blog'
import { notFound } from 'next/navigation'
import { computePostSeoScore } from '@/lib/utils'
import { Image as ImageIcon, FileText, Link as LinkIcon } from 'lucide-react'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    await requirePageRole(["ADMIN","MANAGER","BLOG_MODERATOR"])

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

    const content = post.content || ''
    const seoScore = computePostSeoScore(content)

    // Compter les images dans le contenu (balises <img> + markdown ![...](...)
    const htmlImgMatches = content.match(/<img[^>]*>/gi) || []
    const mdImgMatches = content.match(/!\[.*?\]\(.*?\)/g) || []
    const imageCount = htmlImgMatches.length + mdImgMatches.length

    // Compter les liens
    const htmlLinkMatches = content.match(/<a\s[^>]*href=/gi) || []
    const mdLinkMatches = content.match(/(?<!!)(\[.*?\]\(.*?\))/g) || []
    const linkCount = htmlLinkMatches.length + mdLinkMatches.length

    // Compter les mots
    const plainText = content
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/[#*`_]/g, ' ')
    const wordCount = plainText.split(/\s+/).filter(Boolean).length

    return (
        <div className="space-y-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-[#0f0f0f] tracking-tight mb-3">Modifier l'article</h1>
                    <p className="text-gray-500 font-medium text-lg">Mettez à jour le contenu de votre article avec l'éditeur premium</p>
                </div>

                {/* Statistiques de l'article */}
                <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
                    {/* Score SEO */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-sm min-w-[110px]">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Score SEO</span>
                        <span className={`text-3xl font-black ${
                            seoScore >= 80 ? 'text-green-500' :
                            seoScore >= 50 ? 'text-orange-500' : 'text-red-500'
                        }`}>
                            {seoScore}
                            <span className="text-sm text-gray-400 ml-1">/100</span>
                        </span>
                    </div>

                    {/* Images */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-sm min-w-[110px]">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Images
                        </span>
                        <span className={`text-3xl font-black ${imageCount > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                            {imageCount}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold mt-0.5">dans le contenu</span>
                    </div>

                    {/* Mots */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-sm min-w-[110px]">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Mots
                        </span>
                        <span className={`text-3xl font-black ${wordCount >= 500 ? 'text-green-500' : wordCount >= 200 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {wordCount}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold mt-0.5">recommandé 500+</span>
                    </div>

                    {/* Liens */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-sm min-w-[110px]">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Liens
                        </span>
                        <span className={`text-3xl font-black ${linkCount > 0 ? 'text-indigo-500' : 'text-gray-300'}`}>
                            {linkCount}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold mt-0.5">internes / externes</span>
                    </div>
                </div>
            </div>

            <PostForm post={post} isEditing />
        </div>
    )
}
