import { normalizeImage } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { Facebook, Instagram, Twitter, User, BookOpen, Calendar, ArrowRight, Compass, Briefcase, Search, Edit2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { getCommunityUser } from '@/lib/actions/community-auth'

export async function generateMetadata({ params }: { params: Promise<{ id: string, locale: string }> }) {
    const { id, locale } = await params
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return {}

    return {
        title: `${user.fullName || user.email} | Blog Riwaya`,
        description: user.bio || `Découvrez les articles écrits par ${user.fullName || user.email} sur le blog Riwaya.`
    }
}

export default async function BlogAuthorPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
    const { id, locale } = await params
    const t = await getTranslations('BlogList') // Utiliser BlogList ou similaire
    const currentUser = await getCommunityUser()
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@riwaya.com'

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            posts: {
                where: { published: true, language: locale },
                orderBy: { publishedAt: 'desc' },
                include: {
                    author: { select: { fullName: true, image: true, id: true } },
                    _count: { select: { comments: { where: { isApproved: true } } } }
                }
            }
        }
    })

    if (!user) {
        notFound()
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            {/* Header Profil (Style Banner) */}
            <div className="bg-white border-b border-slate-100 relative">
                <div className="absolute inset-0 bg-[url('/img/pattern.svg')] opacity-5"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 relative z-10">

                    {currentUser && (
                        <div className="absolute top-4 ltr:right-4 rtl:left-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white shadow-sm border border-slate-200 rounded-full text-[10px] rtl:text-xs font-black uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                {locale === 'ar' ? 'متصل كـ:' : 'Connecté en tant que:'} <span className="text-indigo-600">{currentUser.role}</span>
                            </span>
                        </div>
                    )}
                    {/* En-tête de l'auteur */}
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 relative overflow-hidden">

                        {/* Fond décoratif (Glassmorphism) */}
                        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-blue-50 to-indigo-50/50 -z-10" />

                        {/* Avatar */}
                        <div className="shrink-0 relative">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt={user.fullName || 'Author'}
                                    width={160}
                                    height={160}
                                    className="rounded-full w-32 h-32 md:w-40 md:h-40 object-cover shadow-xl ring-4 ring-white"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-200 flex items-center justify-center shadow-xl ring-4 ring-white">
                                    <User className="w-12 h-12 md:w-16 md:h-16 text-slate-400" />
                                </div>
                            )}
                            <div className="absolute -bottom-3 -right-3 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg border-4 border-white" title={user.editorialRole || 'Rédacteur'}>
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Infos de l'auteur */}
                        <div className="flex-1 text-center md:text-start pt-4 md:pt-0">
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                                {user.fullName || user.email?.split('@')[0]}
                                <span className="text-xs rtl:text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal font-bold">
                                    {user.role}
                                </span>
                            </h1>
                            <p className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-6">
                                {user.editorialRole || 'Auteur & Rédacteur'}
                            </p>

                            {user.bio ? (
                                <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto md:mx-0 mb-8 font-medium">
                                    {user.bio}
                                </p>
                            ) : (
                                <p className="text-slate-400 text-base md:text-lg italic mb-8">
                                    Cet auteur n'a pas encore rédigé de biographie.
                                </p>
                            )}

                            {/* Réseaux sociaux et actions Admin */}
                            {(user.facebook || user.instagram || user.twitter || isAdmin) && (
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                    {user.facebook && (
                                        <a aria-label="Action Facebook" href={user.facebook.includes('http') ? user.facebook : `https://facebook.com/${user.facebook}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                    )}
                                    {user.instagram && (
                                        <a aria-label="Action Instagram" href={user.instagram.includes('http') ? user.instagram : `https://instagram.com/${user.instagram}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-600 hover:text-white transition-all shadow-sm">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {user.twitter && (
                                        <a aria-label="Action Twitter" href={user.twitter.includes('http') ? user.twitter : `https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 text-slate-700 rounded-full hover:bg-black hover:text-white transition-all shadow-sm">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}

                                    {isAdmin && (
                                        <a
                                            href={`/${locale}/admin/users`}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs rtl:text-sm font-black rounded-full uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 md:ml-auto rtl:md:mr-auto rtl:md:ml-0"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            {locale === 'ar' ? 'تعديل (المدير)' : 'Éditer (Admin)'}
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section Éditoriale */}
                    {(user.editorialDomains || user.editorialExperience || user.editorialMethodology) && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {user.editorialDomains && (
                                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                                        <Compass className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                                            <Compass className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-3">Domaines de prédilection</h3>
                                        <p className="text-slate-600 leading-relaxed font-medium">
                                            {user.editorialDomains}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {user.editorialExperience && (
                                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                                        <Briefcase className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                            <Briefcase className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-3">Parcours & Expérience</h3>
                                        <p className="text-slate-600 leading-relaxed font-medium">
                                            {user.editorialExperience}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {user.editorialMethodology && (
                                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                                        <Search className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                            <Search className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-3">Méthode de sélection</h3>
                                        <p className="text-slate-600 leading-relaxed font-medium">
                                            {user.editorialMethodology}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Articles de l'auteur */}
                    <div className="mt-16 md:mt-24">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Articles publiés</h2>
                                <p className="text-slate-500 font-medium text-lg">Retrouvez toutes les publications de {user.fullName || 'cet auteur'}.</p>
                            </div>
                            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold">
                                {user.posts.length} article{user.posts.length > 1 ? 's' : ''}
                            </div>
                        </div>

                        {user.posts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {user.posts.map((post) => (
                                    <Link
                                        key={post.id}
                                        href={`/blog/${post.slug}`}
                                        className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                                            {post.coverImage ? (
                                                <Image
                                                    src={normalizeImage(post.coverImage)}
                                                    alt={post.title}
                                                    fill
                                                    className="object-contain group-hover:scale-105 transition-transform duration-700 p-2"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-gray-200 font-black text-2xl">Riwaya</span>
                                                </div>
                                            )}
                                            {post.category && (
                                                <div className="absolute top-4 left-4">
                                                    <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-[0.25em] rounded-full">
                                                        {post.category}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                                {post.publishedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-black text-slate-900 text-lg leading-tight mb-3 group-hover:text-slate-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            {post.excerpt && (
                                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                                                    {post.excerpt}
                                                </p>
                                            )}
                                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
                                                    Lire l'article
                                                </span>
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Aucun article publié</h3>
                                <p className="text-slate-500 max-w-md mx-auto">Cet auteur n'a pas encore publié d'articles dans cette langue.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
