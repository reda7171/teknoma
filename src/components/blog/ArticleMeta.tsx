import { Calendar, User, Eye, MessageSquare, Clock } from 'lucide-react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'

interface ArticleMetaProps {
    author?: {
        id?: string | null
        fullName?: string | null
        image?: string | null
    } | null
    authorName?: string | null
    displayAuthor: string
    publishedAt?: Date | null
    locale: string
    readingTime: number
    viewCount: number
    commentsCount?: number
    translations: {
        MinRead: string
        Views: string
        Comments: string
    }
}

export default function ArticleMeta({
    author,
    authorName,
    displayAuthor,
    publishedAt,
    locale,
    readingTime,
    viewCount,
    commentsCount = 0,
    translations
}: ArticleMetaProps) {
    /* Lien vers la page blog filtrée par auteur */
    const authorHref = author?.id ? `/blog?author=${author.id}` : null

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-[12px] font-bold uppercase tracking-wide text-slate-500 border-y md:border-t md:border-b-0 border-slate-100 py-4 md:pt-6 md:pb-0 mt-6 md:mt-8">
            
            {/* Ligne 1 sur mobile : Auteur et Date */}
            <div className="flex items-center gap-4">
                {(authorName || author?.fullName) && (
                    authorHref ? (
                        <Link
                            href={authorHref}
                            className="flex items-center gap-2 text-slate-800 bg-slate-50 pr-4 rtl:pr-0 rtl:pl-4 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            {author?.image ? (
                                <Image
                                    src={author.image}
                                    alt={author.fullName || ''}
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover ring-2 ring-white w-8 h-8"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-500" />
                                </div>
                            )}
                            <span className="hover:underline underline-offset-2">{displayAuthor}</span>
                        </Link>
                    ) : (
                        <span className="flex items-center gap-2 text-slate-800 bg-slate-50 pr-4 rtl:pr-0 rtl:pl-4 rounded-full">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-500" />
                            </div>
                            {displayAuthor}
                        </span>
                    )
                )}
                
                {publishedAt && (
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                            day: 'numeric', month: 'short', year: 'numeric'
                        })}
                    </span>
                )}
            </div>

            {/* Ligne 2 sur mobile : Temps de lecture, Vues, Commentaires */}
            <div className="flex items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {readingTime} {translations.MinRead}
                </span>
                
                <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {viewCount} {translations.Views}
                </span>
                
                {commentsCount > 0 && (
                    <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        {commentsCount} {translations.Comments}
                    </span>
                )}
            </div>
            
        </div>
    )
}
