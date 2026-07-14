'use client'

import { useState } from 'react'
import { Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AddToCartButton from '@/components/AddToCartButton'
import WhatsAppOrderButton from '@/components/WhatsAppOrderButton'
import BookReplacementModal from './BookReplacementModal'
import { Link } from '@/i18n/routing'

interface Book {
    id: string
    title: string
    author: string
    image: string
    price: number
    stock: number
}

interface Pack {
    id: string
    name: string
    price: number
    image: string | null
    shippingFees: number
    books: { book: Book }[]
}

interface Props {
    pack: Pack
    whatsappPhone?: string
}

export default function PackCustomizerClient({ pack, whatsappPhone }: Props) {
    const t = useTranslations('PackDetail')
    const tCommon = useTranslations('Common')

    const [replacedBooks, setReplacedBooks] = useState<Record<string, { id: string, title: string }>>({})
    const [replacementModalOpen, setReplacementModalOpen] = useState(false)
    const [selectedBookForReplacement, setSelectedBookForReplacement] = useState<string | null>(null)

    const hasMissingBooks = pack.books.some(pb => pb.book.stock <= 0 && !replacedBooks[pb.book.id])

    const handleReplace = (originalBookId: string) => {
        setSelectedBookForReplacement(originalBookId)
        setReplacementModalOpen(true)
    }

    const onSelectReplacement = (newBook: Book) => {
        if (selectedBookForReplacement) {
            setReplacedBooks(prev => ({
                ...prev,
                [selectedBookForReplacement]: { id: newBook.id, title: newBook.title }
            }))
        }
    }

    return (
        <>
            <div className="mb-12">
                <h3 className="text-[10px] rtl:text-sm font-black uppercase tracking-[0.3em] rtl:tracking-normal text-black mb-8 flex items-center gap-4">
                    <Sparkles className="w-4 h-4 text-black" />
                    {t('BundleContent') || 'Contenu du pack'}
                </h3>
                <ul className="space-y-4">
                    {pack.books.map((pb) => {
                        const isMissing = pb.book.stock <= 0
                        const replacement = replacedBooks[pb.book.id]

                        return (
                            <li key={pb.book.id} className="flex flex-col gap-2">
                                <div className="flex items-start gap-4">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${replacement ? 'bg-black text-white' : isMissing ? 'bg-red-100 text-red-500' : 'bg-black text-white'}`}>
                                        {isMissing && !replacement ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1">
                                        {replacement ? (
                                            <>
                                                <Link href={`/books/${replacement.id}`} className="text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-black hover:underline cursor-pointer block w-fit">{replacement.title}</Link>
                                                <Link href={`/books/${pb.book.id}`} className="text-[10px] text-gray-400 mt-1 line-through hover:text-gray-600 block w-fit">{pb.book.title}</Link>
                                            </>
                                        ) : (
                                            <Link href={`/books/${pb.book.id}`} className={`text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal hover:underline cursor-pointer block w-fit ${isMissing ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-black'}`}>
                                                {pb.book.title}
                                            </Link>
                                        )}
                                        
                                        {isMissing && !replacement && (
                                            <div className="mt-2 flex items-center gap-4">
                                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">
                                                    En rupture
                                                </span>
                                                <button 
                                                    onClick={() => handleReplace(pb.book.id)}
                                                    className="text-[10px] text-black font-black uppercase tracking-widest hover:underline flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Remplacer
                                                </button>
                                            </div>
                                        )}
                                        {replacement && (
                                            <div className="mt-2">
                                                <button 
                                                    onClick={() => handleReplace(pb.book.id)}
                                                    className="text-[10px] text-gray-400 hover:text-black font-black uppercase tracking-widest hover:underline flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Changer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="space-y-4">
                {hasMissingBooks && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-4">
                        <p className="text-xs text-red-600 font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Veuillez remplacer le(s) livre(s) en rupture de stock pour continuer.
                        </p>
                    </div>
                )}
                
                <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col gap-3 pb-safe md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none md:border-none md:shadow-none md:space-y-4 md:gap-0 ${hasMissingBooks ? 'opacity-50 pointer-events-none' : ''}`}>
                    <WhatsAppOrderButton
                        title={pack.name}
                        price={pack.price}
                        phone={whatsappPhone}
                        type="pack"
                        replacedBooks={replacedBooks}
                    />
                        <AddToCartButton
                            product={{
                                id: pack.id,
                                title: pack.name,
                                price: pack.price,
                                image: pack.image || pack.books[0]?.book.image || '',
                                type: 'PACK',
                                shippingFees: pack.shippingFees,
                                replacedBooks: Object.keys(replacedBooks).length > 0 ? replacedBooks : undefined
                            }}
                            className="!py-4 md:!py-8 text-xs rtl:text-sm font-black uppercase tracking-[0.3em] rtl:tracking-normal !rounded-full shadow-2xl hover:shadow-black/20"
                        />
                </div>
            </div>

            {selectedBookForReplacement && (
                <BookReplacementModal
                    isOpen={replacementModalOpen}
                    onClose={() => setReplacementModalOpen(false)}
                    originalBookId={selectedBookForReplacement}
                    onSelectReplacement={onSelectReplacement}
                />
            )}
        </>
    )
}
