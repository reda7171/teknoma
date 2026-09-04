import Link from 'next/link'
import { Package, LayoutGrid, AlertCircle } from 'lucide-react'

interface Pack {
    id: string
    name: string
    active: boolean
}

interface SeoCategory {
    id: string
    title: string
    slug: string
}

interface BookMembershipsProps {
    locale: string
    packs: Pack[]
    collections: SeoCategory[]
}

export default function BookMemberships({ locale, packs, collections }: BookMembershipsProps) {
    const hasPacks = packs.length > 0
    const hasCollections = collections.length > 0
    const hasNone = !hasPacks && !hasCollections

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mt-6">
            <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-900 text-base">Appartenance</h3>
            </div>

            {hasNone ? (
                <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl text-sm text-gray-500">
                    <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    Ce livre n'appartient à aucun pack ni collection SEO.
                </div>
            ) : (
                <div className="space-y-4">

                    {/* Packs */}
                    {hasPacks && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" /> Packs ({packs.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {packs.map((pack) => (
                                    <Link
                                        key={pack.id}
                                        href={`/${locale}/admin/packs/${pack.id}/edit`}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                                            pack.active
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                : 'bg-gray-50 text-gray-400 border-gray-200 line-through hover:bg-gray-100'
                                        }`}
                                    >
                                        <Package className="w-3.5 h-3.5 flex-shrink-0" />
                                        {pack.name}
                                        {!pack.active && (
                                            <span className="ml-1 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md no-underline">
                                                inactif
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Collections SEO */}
                    {hasCollections && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <LayoutGrid className="w-3.5 h-3.5" /> Collections SEO ({collections.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {collections.map((col) => (
                                    <Link
                                        key={col.id}
                                        href={`/${locale}/collection/${col.slug}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
                                        {col.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    )
}
