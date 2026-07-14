'use client'

import { useEffect, useState } from 'react'
import { getBookmarksUpsell } from '@/lib/actions/upsell'
import { useCartStore } from '@/store/cart'
import { normalizeImage } from '@/lib/utils'
import { Plus, Bookmark } from 'lucide-react'

export default function CartBookmarksUpsell() {
    const [bookmark, setBookmark] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { items, addItem } = useCartStore()

    useEffect(() => {
        const fetchBookmark = async () => {
            const data = await getBookmarksUpsell()
            setBookmark(data)
            setLoading(false)
        }
        fetchBookmark()
    }, [])

    if (loading || !bookmark) return null

    // Ne pas afficher si les marque-pages sont déjà dans le panier
    const isAlreadyInCart = items.some(item => item.id === bookmark.id)
    if (isAlreadyInCart) return null

    const handleAdd = () => {
        addItem({
            id: bookmark.id,
            title: bookmark.title,
            price: bookmark.price,
            image: bookmark.image,
            type: 'BOOK',
            shippingFees: 0,
        })
    }

    return (
        <div className="mt-4 mb-2 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900">N'oubliez pas vos marque-pages !</h4>
            </div>
            <div className="flex gap-4 items-center bg-white p-3 rounded-xl shadow-sm border border-amber-50">
                <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                        src={normalizeImage(bookmark.image)}
                        alt={bookmark.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-black truncate">{bookmark.title}</h5>
                    <p className="text-xs text-amber-600 font-black">{bookmark.price} MAD</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-amber-500 hover:text-white transition-colors flex-shrink-0"
                    title="Ajouter au panier"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
