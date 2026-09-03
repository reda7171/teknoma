import Link from 'next/link'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'

interface QuoteCardProps {
    quote: {
        id: string
        text: string
        author: string
        source: string | null
        tags: string | null
        book?: {
            title: string
            image: string
        } | null
    }
    locale: string
    sourceLabel?: string
}

export default function QuoteCard({ quote, locale, sourceLabel = 'Livre source' }: QuoteCardProps) {
    const tags = quote.tags
        ? quote.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : []

    return (
        <article className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
            {/* Top accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-rose-400 to-pink-400" />

            <div className="p-6 md:p-8">
                {/* Grand guillemet */}
                <div className="text-[64px] font-serif leading-none text-amber-100 select-none mb-1 h-10 overflow-hidden">
                    "
                </div>

                {/* Texte de la citation */}
                <blockquote className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed mb-6 italic">
                    {quote.text}
                </blockquote>

                {/* Auteur + livre lié */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar initiale */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                            {quote.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">― {quote.author}</p>
                            {quote.source && !quote.book && (
                                <p className="text-xs text-slate-400 italic">{quote.source}</p>
                            )}
                        </div>
                    </div>

                    {/* Livre lié */}
                    {quote.book && (
                        <Link
                            href={`/${locale}/books`}
                            className="flex items-center gap-2.5 p-2 pr-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-all group/book"
                        >
                            <div className="w-8 h-11 relative rounded-md overflow-hidden bg-slate-200 flex-shrink-0 shadow-sm">
                                <Image
                                    src={quote.book.image}
                                    alt={quote.book.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> {sourceLabel}
                                </p>
                                <p className="text-xs text-slate-800 font-bold line-clamp-1 group-hover/book:text-amber-700 transition-colors">
                                    {quote.book.title}
                                </p>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-50 flex flex-wrap gap-1.5">
                        {tags.map((tag, i) => (
                            <Link
                                key={i}
                                href={`/${locale}/quotes/tag/${tag}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2.5 py-1 rounded-md transition-colors"
                            >
                                <span className="text-amber-400">#</span>{tag}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </article>
    )
}
