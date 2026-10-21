import { getSettingsByCategory } from '@/lib/actions/site-settings'
import HomepageSectionsForm from '@/components/admin/HomepageSectionsForm'
import HomepageContentForm from '@/components/admin/HomepageContentForm'
import { LayoutDashboard, Type } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function HomepageConfigPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const sp = await searchParams
    const activeTab = sp?.tab === 'sections' ? 'sections' : 'content'

    const [sectionSettings, contentSettings, books] = await Promise.all([
        getSettingsByCategory('homepage_sections'),
        getSettingsByCategory('homepage_content'),
        prisma.book.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                author: true,
                image: true,
                price: true,
                views: true,
            },
            orderBy: [
                { views: 'desc' },
                { title: 'asc' },
            ],
            take: 500,
        }),
    ])

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Homepage<span className="text-indigo-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Configuration de la page d'accueil
                    </p>
                </div>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                    Voir la page →
                </a>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-0">
                <Link
                    href="?tab=content"
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-black rounded-t-xl border-b-2 transition-colors ${activeTab === 'content'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Type className="w-4 h-4" />
                    Contenu & Textes
                </Link>
                <Link
                    href="?tab=sections"
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-black rounded-t-xl border-b-2 transition-colors ${activeTab === 'sections'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Gestion des Sections (Accueil)
                </Link>
            </div>

            {/* Active Tab Panel */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-10">
                {activeTab === 'sections' ? (
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                                <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black tracking-tight uppercase">Ordre & Visibilité des Sections</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Activer, désactiver et réordonner les blocs</p>
                            </div>
                        </div>
                        <HomepageSectionsForm initialSettings={sectionSettings} />
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                <Type className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black tracking-tight uppercase">Contenu & Textes</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Modifier chaque mot, titre et description</p>
                            </div>
                        </div>
                        <HomepageContentForm initialSettings={contentSettings} books={books} />
                    </div>
                )}
            </div>
        </div>
    )
}
