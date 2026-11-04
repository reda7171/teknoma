'use client'

import { useState, useTransition, useOptimistic, useEffect, useRef } from 'react'
import Image from 'next/image'
import { addToWishlist, removeFromWishlist, syncCartToWishlist } from '@/lib/actions/community-wishlist'
import { Plus, Trash2, Loader2, BookMarked, Search, ShoppingCart } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import BookSearchModal, { SelectedBookData } from '@/components/community/BookSearchModal'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { useWishlistStore } from '@/store/wishlist'
import { useCartStore } from '@/store/cart'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { normalizeImage } from '@/lib/utils'

interface WishlistSectionProps {
    wishlist: any[]
}

export default function WishlistSection({ wishlist }: WishlistSectionProps) {
    const t = useTranslations('Community.Wishlist')
    const { showNotification } = useUIStore()
    const [showForm, setShowForm] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const { items: cartItems } = useCartStore()
    const { addItem: addWishlistLocalItem, removeItem: removeWishlistLocalItem } = useWishlistStore()

    const [optimisticWishlist, updateOptimisticWishlist] = useOptimistic(
        wishlist,
        (state, { type, item, id }: { type: 'ADD' | 'DELETE', item?: any, id?: string }) => {
            if (type === 'ADD') return [...state, item]
            if (type === 'DELETE') return state.filter(i => i.id !== id)
            return state
        }
    )

    const currentWishlist = optimisticWishlist

    // Identifier les livres du panier non encore présents dans la wishlist
    const unimportedCartItems = cartItems.filter(cartItem => {
        return !currentWishlist.some(wItem => {
            const wBookId = wItem.bookId || wItem.book?.id
            const wPackId = wItem.packId || wItem.pack?.id
            if (wBookId && wBookId === cartItem.id) return true
            if (wPackId && wPackId === cartItem.id) return true
            if (wItem.id === cartItem.id) return true
            if (wItem.title && cartItem.title && wItem.title.trim().toLowerCase() === cartItem.title.trim().toLowerCase()) return true
            return false
        })
    })

    const handleImportCart = (itemsToImport = unimportedCartItems) => {
        if (!itemsToImport.length) return

        startTransition(async () => {
            itemsToImport.forEach(item => {
                updateOptimisticWishlist({
                    type: 'ADD',
                    item: {
                        id: `cart_${item.id}_${Date.now()}`,
                        bookId: item.type === 'PACK' ? undefined : item.id,
                        packId: item.type === 'PACK' ? item.id : undefined,
                        title: item.title,
                        author: (item as any).author || undefined,
                        book: item.type !== 'PACK' ? { id: item.id, title: item.title, image: item.image, price: item.price } : undefined,
                        pack: item.type === 'PACK' ? { id: item.id, name: item.title, image: item.image, price: item.price } : undefined,
                        isOptimistic: true
                    }
                })

                addWishlistLocalItem({
                    id: item.id,
                    type: item.type === 'PACK' ? 'PACK' : 'BOOK',
                    title: item.title,
                    price: item.price,
                    image: item.image,
                    slug: item.type === 'PACK' ? `/packs/${item.id}` : `/books/${item.id}`
                })
            })

            const res = await syncCartToWishlist(
                itemsToImport.map(i => ({
                    id: i.id,
                    title: i.title,
                    author: (i as any).author,
                    type: i.type,
                    image: i.image
                }))
            )

            if (res.success) {
                showNotification(t('CartImportSuccess'))
                router.refresh()
            }
        })
    }

    // Auto-synchronisation si la wishlist utilisateur est vide mais que son panier contient des livres
    const autoSyncTriggered = useRef(false)
    useEffect(() => {
        if (!autoSyncTriggered.current && wishlist.length === 0 && unimportedCartItems.length > 0) {
            autoSyncTriggered.current = true
            handleImportCart(unimportedCartItems)
        }
    }, [wishlist.length, unimportedCartItems.length])

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData()
        formData.append('title', title)
        formData.append('author', author)

        startTransition(async () => {
            updateOptimisticWishlist({
                type: 'ADD',
                item: { id: Math.random().toString(), title, author, isOptimistic: true }
            })
            setShowForm(false)
            
            try {
                fbPixelEvents.addToCart({
                    id: `wishlist_${Date.now()}`,
                    title: title,
                    price: 0,
                    quantity: 1
                })
            } catch (err) {
                console.error("Facebook pixel error:", err)
            }

            setTitle('')
            setAuthor('')
            await addToWishlist(formData)
            showNotification(t('Success'))
            router.refresh()
        })
    }

    const handleBookSelect = (data: SelectedBookData) => {
        setTitle(data.title)
        setAuthor(data.author)
    }

    async function handleRemove(id: string, bookId?: string) {
        startTransition(async () => {
            updateOptimisticWishlist({ type: 'DELETE', id })
            await removeFromWishlist(id)
            if (bookId) {
                removeWishlistLocalItem(bookId)
            } else {
                removeWishlistLocalItem(id)
            }
            router.refresh()
        })
    }

    return (
        <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-gray-100 shadow-xl shadow-black/5 mb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <BookMarked className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl rtl:text-3xl font-black text-black tracking-tight">{t('Title')}</h2>
                        <p className="text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest text-gray-400">{t('Subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {unimportedCartItems.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleImportCart(unimportedCartItems)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title={t('ImportFromCart')}
                        >
                            <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">{t('ImportFromCart')}</span>
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                                {unimportedCartItems.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => startTransition(() => setShowForm(!showForm))}
                        className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg shrink-0"
                    >
                        <Plus className={`w-5 h-5 transition-transform ${showForm ? 'rotate-45' : ''}`} />
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleAdd} className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="text-xs font-bold px-4 py-2 bg-[#f39c12]/10 text-[#f39c12] rounded-xl hover:bg-[#f39c12]/20 transition-colors flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            Rechercher un livre avec l'IA
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('BookTitle')}</label>
                            <input
                                name="title"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="ex: L'Alchimiste"
                                className="w-full px-5 py-3 bg-white border-2 border-transparent rounded-2xl focus:border-black outline-none transition-all font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Author')}</label>
                            <input
                                name="author"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="ex: Paulo Coelho"
                                className="w-full px-5 py-3 bg-white border-2 border-transparent rounded-2xl focus:border-black outline-none transition-all font-bold text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isPending || !title.trim()}
                        className="w-full bg-black text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('AddBook')}
                    </button>
                </form>
            )}

            <BookSearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                onSelect={handleBookSelect} 
            />

            {currentWishlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentWishlist.map((item) => {
                        const cover = item.book?.image || item.pack?.image || item.image
                        const itemPrice = item.book?.price || item.pack?.price
                        const itemAuthor = item.author || item.book?.author

                        return (
                            <div key={item.id} className="group flex items-center justify-between p-3.5 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-black rounded-2xl transition-all shadow-sm hover:shadow-md gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {cover ? (
                                        <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                                            <Image
                                                src={normalizeImage(cover)}
                                                alt={item.title}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-16 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                            <BookMarked className="w-5 h-5 text-amber-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`font-black text-sm text-black truncate ${item.isOptimistic ? 'opacity-50' : ''}`} title={item.title}>
                                            {item.title}
                                        </h3>
                                        {itemAuthor && (
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                                                {itemAuthor}
                                            </p>
                                        )}
                                        {itemPrice && (
                                            <span className="text-[11px] font-black text-emerald-600">
                                                {itemPrice} DH
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.id, item.bookId || item.book?.id || item.packId || item.pack?.id)}
                                    disabled={isPending}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 shrink-0"
                                    aria-label="Remove"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border-dashed border-2 border-gray-200">
                    <p className="text-gray-400 font-bold text-sm">{t('Empty')}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-1">{t('MatchingNote')}</p>
                </div>
            )}
        </div>
    )
}
