'use client'

import { useState } from 'react'
import { addComment } from '@/lib/actions/comments'
import { MessageSquare, Send, User, Loader2, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useLocale } from 'next-intl'

interface Comment {
    id: string
    content: string
    createdAt: Date
    authorName?: string | null
    user?: {
        fullName: string | null
        image: string | null
    } | null
}

interface CommentsSectionProps {
    postId: string
    postTitle: string
    postCategory: string
    comments: Comment[]
    totalCount: number
}

// Question engageante selon la catégorie
function getEngagingQuestion(category: string, locale: string): string {
    const cat = category.toLowerCase()
    if (locale === 'ar') {
        if (cat.includes('roman') || cat.includes('Tekno Store') || cat.includes('fiction')) return 'هل غيّر هذا المقال نظرتك للقراءة؟'
        if (cat.includes('développement') || cat.includes('تطوير') || cat.includes('personal')) return 'هل جربت تطبيق هذه النصائح؟ شاركنا!'
        return 'ما رأيك في هذا المقال؟ شاركنا تجربتك!'
    }
    if (locale === 'en') {
        if (cat.includes('roman') || cat.includes('fiction') || cat.includes('novel')) return 'Has this article changed how you think about reading?'
        if (cat.includes('personal') || cat.includes('growth') || cat.includes('tips')) return 'Have you tried these tips? Share your experience!'
        return 'What do you think of this article? Share your thoughts!'
    }
    if (cat.includes('roman') || cat.includes('littérature') || cat.includes('fiction')) return 'Cet article a-t-il changé votre rapport à la lecture ?'
    if (cat.includes('développement') || cat.includes('personnel') || cat.includes('conseils')) return 'Avez-vous essayé ces conseils ? Partagez votre expérience !'
    return 'Que pensez-vous de cet article ? Donnez-nous votre avis !'
}

export default function CommentsSection({ postId, postTitle, postCategory, comments, totalCount }: CommentsSectionProps) {
    const [content, setContent] = useState('')
    const [authorName, setAuthorName] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showForm, setShowForm] = useState(false)
    const locale = useLocale()

    const engagingQuestion = getEngagingQuestion(postCategory, locale)

    const L = {
        badge:        locale === 'ar' ? 'شاركنا رأيك'               : locale === 'en' ? 'Share your thoughts'          : 'Partagez votre avis',
        write:        locale === 'ar' ? 'اكتب تعليقاً'               : locale === 'en' ? 'Write a comment'              : 'Écrire un commentaire',
        name:         locale === 'ar' ? 'اسمك (اختياري)'             : locale === 'en' ? 'Your name (optional)'         : 'Votre nom (optionnel)',
        placeholder:  locale === 'ar' ? 'اكتب تعليقك هنا...'         : locale === 'en' ? 'Write your comment here...'   : 'Écrivez votre commentaire ici...',
        submit:       locale === 'ar' ? 'إرسال'                       : locale === 'en' ? 'Send'                         : 'Envoyer',
        cancel:       locale === 'ar' ? 'إلغاء'                       : locale === 'en' ? 'Cancel'                       : 'Annuler',
        success:      locale === 'ar' ? 'شكراً! تعليقك في انتظار المراجعة.' : locale === 'en' ? 'Thanks! Your comment is awaiting approval.' : 'Merci ! Commentaire en attente de modération.',
        error:        locale === 'ar' ? 'حدث خطأ، حاول مجدداً.'       : locale === 'en' ? 'An error occurred, please try again.' : 'Une erreur est survenue, réessayez.',
        noComments:   locale === 'ar' ? 'كن أول من يعلّق!'            : locale === 'en' ? 'Be the first to comment!'    : 'Soyez le premier à commenter !',
        anonymous:    locale === 'ar' ? 'مجهول'                        : locale === 'en' ? 'Anonymous'                   : 'Anonyme',
        countLabel:   (n: number) => locale === 'ar' ? `${n} تعليق` : locale === 'en' ? `${n} comment${n !== 1 ? 's' : ''}` : `${n} commentaire${n !== 1 ? 's' : ''}`,
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return
        setLoading(true)
        const result = await addComment(postId, content, authorName)
        setLoading(false)
        if (result.success) {
            setContent('')
            setAuthorName('')
            setMessage({ type: 'success', text: result.message || L.success })
            setShowForm(false)
        } else {
            setMessage({ type: 'error', text: result.error || L.error })
        }
    }

    return (
        <section className="mt-20 pt-20 border-t border-gray-100 max-w-2xl mx-auto">

            {/* En-tête engageant */}
            <div className="mb-10">
                <div className="flex items-center gap-2 text-rose-500 text-xs font-black uppercase tracking-[0.2em] mb-4">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {L.badge}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-6">
                    {engagingQuestion}
                </h2>

                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="group inline-flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-rose-600 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/20"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {L.write}
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                )}

                {message && !showForm && (
                    <p className={`mt-4 text-xs font-bold px-4 py-3 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </p>
                )}
            </div>

            {/* Formulaire progressif */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mb-12 bg-slate-50 border border-slate-100 p-6 md:p-8 rounded-3xl">
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder={L.name}
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-slate-900 outline-none transition-all font-medium text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <textarea
                            placeholder={L.placeholder}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-slate-900 outline-none transition-all font-medium text-sm resize-none text-slate-900 placeholder:text-slate-400"
                        />

                        {message && (
                            <p className={`text-xs font-bold px-4 py-3 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {message.text}
                            </p>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={loading || !content.trim()}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-rose-600 transition-all duration-300 disabled:opacity-40"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {L.submit}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setMessage(null) }}
                                className="px-5 py-3.5 text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors rounded-2xl hover:bg-slate-100"
                            >
                                {L.cancel}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Compteur */}
            <div className="flex items-center gap-2 mb-8">
                <span className="text-2xl font-black text-slate-900">{totalCount}</span>
                <span className="text-sm font-bold text-slate-500">
                    {L.countLabel(totalCount).replace(String(totalCount), '').trim()}
                </span>
            </div>

            {/* Liste */}
            <div className="space-y-5">
                {comments.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
                        <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-bold text-sm">{L.noComments}</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white">
                                {comment.user?.image ? (
                                    <Image src={comment.user.image} alt="" width={40} height={40} className="object-cover" />
                                ) : (
                                    <User className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-sm px-5 py-4 border border-slate-100 group-hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-sm font-black text-slate-900">
                                        {comment.user?.fullName || comment.authorName || L.anonymous}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {new Date(comment.createdAt).toLocaleDateString(
                                            locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US',
                                            { day: 'numeric', month: 'short', year: 'numeric' }
                                        )}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
