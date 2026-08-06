'use client'

import { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Loader2, Book, Megaphone } from 'lucide-react'
import Image from 'next/image'

interface Asset {
    name: string
    url: string
    type: string
    createdAt: string
}

interface MediaLibraryModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
}

export default function MediaLibraryModal({ isOpen, onClose, onSelect }: MediaLibraryModalProps) {
    const [activeTab, setActiveTab] = useState<'marketing' | 'books'>('books')
    const [marketingAssets, setMarketingAssets] = useState<Asset[]>([])
    const [bookImages, setBookImages] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchAll()
        }
    }, [isOpen])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [assetsRes, mediaRes] = await Promise.all([
                fetch('/api/admin/marketing/assets').catch(() => null),
                fetch('/api/admin/marketing/media').catch(() => null)
            ])
            
            if (assetsRes) {
                const data = await assetsRes.json()
                if (data.success) setMarketingAssets(data.assets || [])
            }

            if (mediaRes) {
                const data = await mediaRes.json()
                if (data.success && data.books) {
                    const bImages = data.books.map((b: any) => ({
                        name: b.title,
                        url: b.image,
                        type: 'BOOK',
                        createdAt: new Date().toISOString()
                    }))
                    // Remove duplicates
                    const uniqueBooks = Array.from(new Map(bImages.map((item: any) => [item.url, item])).values())
                    setBookImages(uniqueBooks as Asset[])
                }
            }
        } catch (error) {
            console.error('Failed to fetch media:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const currentAssets = activeTab === 'marketing' ? marketingAssets : bookImages

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-bold text-lg flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-indigo-500" />
                        Parcourir la Médiathèque
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="flex border-b bg-gray-50 px-4 pt-2">
                    <button
                        onClick={() => setActiveTab('books')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center ${
                            activeTab === 'books'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Book className="w-4 h-4 mr-2" />
                        Images de livres
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center ${
                            activeTab === 'marketing'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Megaphone className="w-4 h-4 mr-2" />
                        Créatives Marketing
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : currentAssets.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentAssets.map((asset, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onSelect(asset.url)}
                                    className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 cursor-pointer transition-all"
                                >
                                    <Image
                                        src={asset.url}
                                        alt={asset.name || 'image'}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 20vw"
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 font-bold px-3 py-1 rounded-full text-sm transform translate-y-2 group-hover:translate-y-0 transition-all shadow-md">
                                            Sélectionner
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Aucun média trouvé.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
