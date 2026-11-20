'use client'

import { useMemo } from 'react'
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react'

interface BookSeoScoreProps {
    book: any
    description: string
    descriptionFr: string
    descriptionEn: string
    longDescription: string
    seoKeywords?: string
    bookImage?: string
}

interface SeoCheck {
    label: string
    pass: boolean
    warning?: boolean
    tip: string
}

export default function BookSeoScore({
    book,
    description,
    descriptionFr,
    descriptionEn,
    longDescription,
    seoKeywords,
    bookImage,
}: BookSeoScoreProps) {
    const checks: SeoCheck[] = useMemo(() => {
        const title = book?.title || ''
        const titleFr = book?.titleFr || ''
        const author = book?.author || ''
        const desc = description || ''
        const descFr = descriptionFr || ''
        const longDesc = longDescription || ''
        const keywords = seoKeywords || book?.seoKeywords || ''
        const image = bookImage || book?.image || ''
        const price = book?.price || 0
        const stock = book?.stock ?? -1
        const isbn = book?.isbn || ''

        return [
            {
                label: 'Titre arabe renseigné',
                pass: title.length >= 5,
                tip: 'Le titre arabe est la clé principale. Min. 5 caractères.',
            },
            {
                label: 'Titre français renseigné',
                pass: titleFr.length >= 5,
                warning: titleFr.length > 0 && titleFr.length < 5,
                tip: 'Le titre FR améliore la portée multilingue.',
            },
            {
                label: 'Titre < 70 caractères',
                pass: title.length <= 70 && title.length >= 5,
                warning: title.length > 60 && title.length <= 70,
                tip: 'Google tronque les titres > 70 car. dans les résultats.',
            },
            {
                label: 'Auteur renseigné',
                pass: author.length >= 2,
                tip: 'L\'auteur est un facteur de confiance et de recherche.',
            },
            {
                label: 'Description courte (AR) ≥ 80 car.',
                pass: desc.length >= 80,
                warning: desc.length > 0 && desc.length < 80,
                tip: 'Une description courte riche en mots-clés booste le CTR.',
            },
            {
                label: 'Description courte (FR) ≥ 80 car.',
                pass: descFr.length >= 80,
                warning: descFr.length > 0 && descFr.length < 80,
                tip: 'La description FR est affichée sur la version française.',
            },
            {
                label: 'Description longue ≥ 200 car.',
                pass: longDesc.length >= 200,
                warning: longDesc.length > 0 && longDesc.length < 200,
                tip: 'Les descriptions longues aident Google à mieux comprendre le livre.',
            },
            {
                label: 'Mots-clés SEO renseignés',
                pass: keywords.split(',').filter((k: string) => k.trim()).length >= 3,
                warning: keywords.length > 0 && keywords.split(',').filter((k: string) => k.trim()).length < 3,
                tip: 'Ajoutez min. 3 mots-clés séparés par des virgules.',
            },
            {
                label: 'Image de couverture présente',
                pass: image.length > 5,
                tip: 'Les livres avec image ont un taux de clic 3x supérieur.',
            },
            {
                label: 'Prix défini',
                pass: price > 0,
                tip: 'Le prix est un signal de confiance pour les moteurs de recherche.',
            },
            {
                label: 'Stock ≥ 1',
                pass: stock >= 1,
                tip: 'Les livres en stock sont mieux indexés par Google Shopping.',
            },
            {
                label: 'ISBN renseigné',
                pass: isbn.length >= 10,
                warning: isbn.length > 0 && isbn.length < 10,
                tip: 'L\'ISBN permet le référencement dans les bases de données de livres.',
            },
        ]
    }, [book, description, descriptionFr, descriptionEn, longDescription, seoKeywords, bookImage])

    const passed = checks.filter((c) => c.pass).length
    const total = checks.length
    const score = Math.round((passed / total) * 100)

    const scoreColor =
        score >= 80 ? 'text-emerald-600' :
        score >= 50 ? 'text-amber-500' :
        'text-red-500'

    const scoreBg =
        score >= 80 ? 'bg-emerald-50 border-emerald-200' :
        score >= 50 ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'

    const scoreLabel =
        score >= 80 ? 'Excellent' :
        score >= 60 ? 'Bon' :
        score >= 40 ? 'Moyen' :
        'À améliorer'

    const circumference = 2 * Math.PI * 28
    const strokeDash = (score / 100) * circumference

    return (
        <div className={`rounded-2xl border p-5 ${scoreBg} mt-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <h3 className="font-bold text-gray-900 text-base">Score SEO</h3>
                </div>
                {/* Circular score */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{passed}/{total} critères</span>
                    <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                            <circle
                                cx="32" cy="32" r="28" fill="none"
                                stroke={score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="7"
                                strokeDasharray={`${strokeDash} ${circumference}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-base font-black ${scoreColor}`}>{score}</span>
                        </div>
                    </div>
                    <div>
                        <p className={`text-sm font-black ${scoreColor}`}>{scoreLabel}</p>
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checks.map((check, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-2 p-2.5 rounded-xl text-sm ${
                            check.pass
                                ? 'bg-white/70 text-gray-700'
                                : check.warning
                                ? 'bg-amber-50/50 text-amber-800'
                                : 'bg-white/40 text-gray-500'
                        }`}
                        title={check.tip}
                    >
                        {check.pass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : check.warning ? (
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`${check.pass ? 'font-medium' : 'font-normal'} leading-tight`}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Tip du moment */}
            {passed < total && (
                <p className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-amber-500">💡</span>
                    {checks.find((c) => !c.pass)?.tip}
                </p>
            )}
        </div>
    )
}
