'use client'

import { useState } from 'react'
import { Star, CheckCircle, Trash2, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { approveReview, deleteReviews, deleteReview } from '@/lib/actions/reviews'

interface Review {
    id: string
    fullName: string
    rating: number
    comment: string
    isApproved: boolean
    createdAt: Date
    image: string | null
    book: {
        id: string
        title: string
        image: string
    }
}

export default function ReviewsTable({ reviews }: { reviews: Review[] }) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(reviews.map(r => r.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.size} avis ?`)) return

        setIsDeleting(true)
        const res = await deleteReviews(Array.from(selectedIds))
        setIsDeleting(false)

        if (res.success) {
            setSelectedIds(new Set())
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <span className="text-sm font-bold text-blue-800">
                        {selectedIds.size} avis sélectionné(s)
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            <tr>
                                <th className="px-6 py-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={reviews.length > 0 && selectedIds.size === reviews.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-6">Lecteur & Note</th>
                                <th className="px-10 py-6">Livre Concerné</th>
                                <th className="px-10 py-6">Commentaire</th>
                                <th className="px-10 py-6">État</th>
                                <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <MessageSquare className="w-20 h-20 mb-4" />
                                            <p className="font-black uppercase tracking-widest text-[10px]">Aucun avis à modérer</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => (
                                    <tr key={review.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.has(review.id) ? 'bg-gray-50/50' : ''}`}>
                                        <td className="px-6 py-6">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(review.id)}
                                                onChange={(e) => handleSelect(review.id, e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="font-black text-black uppercase tracking-tight text-xs italic">{review.fullName}</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                    <Image
                                                        src={review.book.image}
                                                        alt={review.book.title}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                                <span className="font-bold text-black text-[10px] uppercase tracking-tight line-clamp-2 max-w-[150px] italic leading-relaxed">
                                                    {review.book.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-gray-600 font-bold italic line-clamp-2 max-w-md leading-relaxed text-xs">
                                                "{review.comment}"
                                            </p>
                                            {review.image && (
                                                <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:scale-110 transition-transform">
                                                    <Image
                                                        src={review.image}
                                                        alt="Avis Image"
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6">
                                            {review.isApproved ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Validé
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-orange-100 shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                    Attente
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!review.isApproved && (
                                                    <button
                                                        onClick={async () => {
                                                            await approveReview(review.id)
                                                            router.refresh()
                                                        }}
                                                        className="p-3 bg-white text-black border border-gray-100 rounded-xl hover:bg-black hover:text-white hover:border-black transition-all shadow-sm active:scale-90"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Voulez-vous supprimer cet avis ?')) {
                                                            await deleteReview(review.id)
                                                            router.refresh()
                                                        }
                                                    }}
                                                    className="p-3 bg-white text-red-600 border border-red-50 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-90"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
