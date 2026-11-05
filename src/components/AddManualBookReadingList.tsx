'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Book, Search } from 'lucide-react'
import { addToReadingList } from '@/lib/actions/reading-list'
import { useUIStore } from '@/store/ui'
import { ReadingStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import BookSearchModal, { SelectedBookData } from '@/components/community/BookSearchModal'

export default function AddManualBookReadingList() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { showNotification } = useUIStore()
    const router = useRouter()
    const t = useTranslations('Community')

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        totalPages: 200,
        status: ReadingStatus.TO_READ as ReadingStatus,
        cover: ''
    })

    const handleBookSelect = (data: SelectedBookData) => {
        setFormData({
            ...formData,
            title: data.title,
            author: data.author,
            cover: data.cover || ''
        })
        setIsOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await addToReadingList({
                title: formData.title,
                author: formData.author,
                totalPages: Number(formData.totalPages),
                status: formData.status,
                cover: formData.cover
            })

            if (result.success) {
                showNotification(result.message || 'Livre ajouté à votre liste !', 'success')
                setIsOpen(false)
                setFormData({ title: '', author: '', totalPages: 200, status: ReadingStatus.TO_READ, cover: '' })
                router.refresh()
            } else {
                if (result.error === 'Vous devez être connecté') {
                    showNotification("Veuillez vous connecter pour ajouter un livre", 'error')
                } else {
                    showNotification(result.error || 'Une erreur est survenue', 'error')
                }
            }
        } catch (error) {
            showNotification('Erreur lors de l\'ajout', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mb-8">
            {!isOpen ? (
                <>
                    {/* Desktop Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center justify-center gap-2 bg-[#f39c12]/10 text-[#f39c12] px-6 py-3 rounded-xl font-bold hover:bg-[#f39c12]/20 transition-all active:scale-95 shadow-lg shadow-[#f39c12]/5"
                        >
                            <Search className="w-5 h-5" />
                            {t('ReadingList.ManualBook.SearchBook')}
                        </button>
                        <button
                            onClick={() => setIsOpen(true)}
                            className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                            <Plus className="w-5 h-5" />
                            {t('ReadingList.ManualBook.ManualEntry')}
                        </button>
                    </div>

                    {/* Mobile FABs */}
                    <div className="md:hidden fixed bottom-28 left-4 z-[70] flex flex-col gap-3">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center justify-center w-14 h-14 bg-[#f39c12] text-white rounded-full hover:bg-[#e67e22] transition-all active:scale-95 shadow-xl shadow-[#f39c12]/20"
                        >
                            <Search className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsOpen(true)}
                            className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/20"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="fixed inset-0 z-50 md:relative md:z-auto bg-white/95 md:bg-white backdrop-blur-xl md:backdrop-blur-none p-6 md:p-6 md:rounded-2xl md:border md:border-gray-100 shadow-xl overflow-y-auto md:overflow-visible animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6 pt-12 md:pt-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <Book className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="font-black text-xl text-black">{t('ReadingList.ManualBook.NewBook')}</h3>
                            
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="ml-4 text-xs font-bold px-3 py-1.5 bg-[#f39c12]/10 text-[#f39c12] rounded-lg hover:bg-[#f39c12]/20 transition-colors flex items-center gap-1.5"
                            >
                                <Search className="w-3.5 h-3.5" />
                                {t('ReadingList.ManualBook.Search')}
                            </button>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase mx-1">{t('ReadingList.ManualBook.Title')}</label>
                            <input
                                required
                                type="text"
                                placeholder={t('ReadingList.ManualBook.TitleEx')}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase mx-1">{t('ReadingList.ManualBook.Author')}</label>
                            <input
                                required
                                type="text"
                                placeholder={t('ReadingList.ManualBook.AuthorEx')}
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase mx-1">{t('ReadingList.ManualBook.TotalPages')}</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.totalPages}
                                onChange={(e) => setFormData({ ...formData, totalPages: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all font-medium"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {t('ReadingList.AddBook')}
                        </button>
                    </form>
                </div>
            )}

            <BookSearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                onSelect={handleBookSelect} 
            />
        </div>
    )
}
