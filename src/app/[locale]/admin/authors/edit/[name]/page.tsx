import { requirePageRole } from '@/lib/page-authorization'
import { getAuthorProfile } from '@/lib/db/authors'
import { getBooks } from '@/lib/db/books'
import { redirect } from 'next/navigation'
import EditAuthorClient from './EditAuthorClient'
import { ArrowLeft, Globe, BookOpen } from 'lucide-react'
import Link from 'next/link'
import BookCard from '@/components/BookCard'

export default async function EditAuthorPage({
    params,
}: {
    params: Promise<{ name: string; locale: string }>
}) {
    await requirePageRole(["ADMIN","MANAGER","BLOG_MODERATOR"])

    const { name, locale } = await params
    const decodedName = decodeURIComponent(name)
    const [authorProfile, books] = await Promise.all([
        getAuthorProfile(decodedName),
        getBooks({ author: decodedName, limit: 100 })
    ])

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link
                        href={`/${locale}/admin/authors`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black mb-4 md:mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour aux auteurs
                    </Link>
                    <h1 className="text-4xl font-black text-black tracking-tighter italic">
                        Profil de {decodedName}<span className="text-gray-200">.</span>
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Identité & Narration culturelle</p>
                </div>
                <a
                    href={`/${locale}/authors/${encodeURIComponent(decodedName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
                >
                    <Globe className="w-4 h-4" />
                    Visualiser la page auteur
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Edit Form */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-xl shadow-black/5 overflow-hidden border border-gray-100">
                    <EditAuthorClient
                        authorName={decodedName}
                        initialProfile={authorProfile}
                    />
                </div>

                {/* Right Column: Books */}
                <div className="lg:col-span-1 space-y-6 sticky top-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-black text-white rounded-2xl shadow-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black tracking-tight italic">
                                Livres de {decodedName}
                            </h2>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
                                {books.length} {books.length > 1 ? 'Ouvrages disponibles' : 'Ouvrage disponible'}
                            </p>
                        </div>
                    </div>

                    {books.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                            {books.map((book) => (
                                <Link
                                    key={book.id}
                                    href={`/${locale}/books/${book.id}`}
                                    target="_blank"
                                    className="group flex gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all items-center"
                                >
                                    <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0 shadow-inner">
                                        {book.image ? (
                                            <img src={book.image} alt={book.title} className="w-full h-full object-cover unoptimized group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BookOpen className="w-4 h-4 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xs font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                            {book.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-pixio-yellow uppercase tracking-widest">
                                                {book.price.toFixed(2)} درهم
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">
                            Aucun livre disponible
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
