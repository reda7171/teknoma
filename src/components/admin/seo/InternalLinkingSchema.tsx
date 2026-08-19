'use client'

import { Network, Home, Library, BookOpen, FileText, ArrowDown, ArrowRight } from 'lucide-react'

export interface SiloData {
    categoryName: string
    books: string[]
    postName: string
}

export default function InternalLinkingSchema({ silos = [] }: { silos?: SiloData[] }) {
    // Fallback si pas de données dynamiques (bien que le serveur le gère aussi)
    const displaySilos = silos.length > 0 ? silos : [
        { categoryName: "Business", books: ["Père Riche Père Pauvre", "Sapiens"], postName: "Comment investir..." },
        { categoryName: "Religion", books: ["Le Coran", "La Citadelle..."], postName: "L'importance de la prière" },
        { categoryName: "Romans", books: ["L'Étranger", "1984"], postName: "Top 10 des Romans" },
    ]

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-8 md:p-12 overflow-hidden">
            <div className="max-w-5xl mx-auto">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-black text-black tracking-tight mb-4">Stratégie en Silo Thématique</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-sm">
                        L'architecture en silo permet de maximiser le transfert du <strong>Jus SEO (Link Juice)</strong> depuis la page d'accueil vers les pages profondes, en gardant une cohérence sémantique forte.
                    </p>
                </div>

                {/* Schema Container */}
                <div className="relative flex flex-col items-center gap-8 py-10">
                    
                    {/* Niveau 1 : Home */}
                    <div className="relative group">
                        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-lg shadow-emerald-500/20 w-64 text-center z-10 relative transition-transform hover:scale-105">
                            <Home className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <h3 className="font-black text-emerald-900 text-lg">Page d'Accueil</h3>
                            <p className="text-xs text-emerald-700 mt-1">Autorité Maximale</p>
                        </div>
                        {/* Flèches descendantes */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 h-8 w-px bg-emerald-300"></div>
                    </div>

                    {/* Ligne horizontale connectrice */}
                    <div className="w-full max-w-3xl h-px bg-emerald-300 relative">
                        <div className="absolute left-0 top-0 h-8 w-px bg-emerald-300"></div>
                        <div className="absolute left-1/2 top-0 h-8 w-px bg-emerald-300 -translate-x-1/2"></div>
                        <div className="absolute right-0 top-0 h-8 w-px bg-emerald-300"></div>
                    </div>

                    {/* Niveau 2 : Catégories Piliers */}
                    <div className="flex w-full max-w-4xl justify-between gap-4 px-4 pt-4">
                        {displaySilos.map((silo, index) => {
                            // Assigner une couleur différente par silo
                            const colors = [
                                { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', icon: 'text-blue-600', sub: 'text-blue-700', line: 'bg-blue-300' },
                                { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-900', icon: 'text-purple-600', sub: 'text-purple-700', line: 'bg-purple-300' },
                                { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', icon: 'text-rose-600', sub: 'text-rose-700', line: 'bg-rose-300' },
                            ]
                            const color = colors[index % colors.length]

                            return (
                                <div key={index} className="flex flex-col items-center flex-1">
                                    <div className={`${color.bg} border-2 ${color.border} rounded-2xl p-5 shadow-md w-full text-center z-10 relative transition-transform hover:scale-105`}>
                                        <Library className={`w-6 h-6 ${color.icon} mx-auto mb-2`} />
                                        <h3 className={`font-bold ${color.text} text-sm line-clamp-1`}>Catégorie: {silo.categoryName}</h3>
                                        <p className={`text-[10px] ${color.sub} mt-1`}>Page Pilier (Hub)</p>
                                    </div>
                                    <div className={`h-8 w-px ${color.line}`}></div>
                                    
                                    {/* Niveau 3 : Produits */}
                                    {silo.books.map((bookTitle, i) => (
                                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full text-center mb-4 transition-transform hover:scale-105">
                                            <BookOpen className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                                            <h4 className="font-semibold text-gray-800 text-xs line-clamp-1">{bookTitle}</h4>
                                        </div>
                                    ))}

                                    {/* Niveau 4 : Blog */}
                                    <div className="h-4 w-px border-l border-dashed border-gray-400"></div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm w-11/12 text-center mt-2">
                                        <FileText className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                                        <h4 className="font-medium text-orange-900 text-[10px] line-clamp-1">Article: {silo.postName}</h4>
                                        <div className="text-[9px] text-orange-600 mt-1 flex items-center justify-center gap-1">
                                            <ArrowRight className="w-3 h-3" /> Lien vers Produit
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                </div>

                <div className="mt-12 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Network className="w-5 h-5 text-emerald-500" />
                        Règles d'Or du Maillage Interne Riwaya
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 list-none">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <p><strong>Cocon Sémantique :</strong> Ne pas lier un produit "Business" vers un produit "Religion" directement (risque de dilution sémantique).</p>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <p><strong>Remontée de Jus :</strong> Les articles de blog doivent toujours pointer vers une catégorie parent ou un produit ciblé (liens contextuels).</p>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <p><strong>Profondeur de clic (Click Depth) :</strong> Tout produit doit être accessible en moins de 3 clics depuis la page d'accueil.</p>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <p><strong>Ancres exactes :</strong> Utiliser des mots-clés exacts pour les liens internes (ex: "Acheter Sapiens" au lieu de "Cliquez ici").</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
