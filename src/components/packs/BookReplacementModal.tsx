'use client'

import { useEffect, useState } from 'react'
import { X, Search, Check, AlertCircle } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { getReplacementBooks } from '@/lib/actions/replacement-books'
import { useTranslations } from 'next-intl'

interface Book {
    id: string
    title: string
    author: string
    image: string
    price: number
    stock: number
}

interface Props {
    isOpen: boolean
    onClose: () => void
    originalBookId: string
    onSelectReplacement: (book: Book) => void
}

export default function BookReplacementModal({ isOpen, onClose, originalBookId, onSelectReplacement }: Props) {
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(true)
    const t = useTranslations('PackDetail')
    const tCommon = useTranslations('Common')

    useEffect(() => {
        if (isOpen && originalBookId) {
            setLoading(true)
            getReplacementBooks(originalBookId, 12).then((res) => {
                setBooks(res)
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        }
    }, [isOpen, originalBookId])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-2xl font-black text-black tracking-tight mb-2">
                        {t('ReplaceBook') || 'Remplacer le livre'}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        {t('ChooseReplacement') || 'Choisissez un livre équivalent pour remplacer le livre en rupture de stock. Le prix du pack restera inchangé.'}
                    </p>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : books.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {books.map((book) => (
                                <div
                                    key={book.id}
                                    onClick={() => {
                                        onSelectReplacement(book)
                                        onClose()
                                    }}
                                    className="bg-white border-2 border-transparent hover:border-black rounded-2xl p-4 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group relative flex flex-col h-full"
                                >
                                    <div className="aspect-[2/3] w-full relative rounded-xl overflow-hidden mb-4 bg-gray-100">
                                        <ImageWithFallback
                                            src={book.image}
                                            alt={book.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <h3 className="font-black text-sm text-black line-clamp-2 leading-tight mb-1">{book.title}</h3>
                                        <p className="text-xs text-gray-400 font-bold mb-3">{book.author}</p>
                                        <div className="mt-auto flex items-center justify-between">
                                            <span className="text-xs font-black bg-gray-100 px-2 py-1 rounded-md">{book.price} MAD</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-6 right-6 w-8 h-8 bg-black rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all">
                                        <Check className="w-4 h-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                            <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-bold">Aucun livre de remplacement trouvé pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
