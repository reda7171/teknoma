'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSeoCategory, createSeoCategory, updateSeoCategoryBooks } from '@/lib/actions/seo-categories'
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

export default function SeoCategoryForm({ category, books }: { category?: any, books: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        slug: category?.slug || '',
        locale: category?.locale || 'fr',
        title: category?.title || '',
        h1: category?.h1 || '',
        description: category?.description || '',
        intro: category?.intro || '',
        categoryText: category?.categoryText || '',
        keyword: category?.keyword || '',
        searchQuery: category?.searchQuery || '',
        colorGradient: category?.colorGradient || '',
        showOnHome: category?.showOnHome || false,
        isActive: category?.isActive ?? true,
        displayOrder: category?.displayOrder || 0
    })

    const [faq, setFaq] = useState<{q: string, a: string}[]>(
        category?.faq ? JSON.parse(category.faq) : []
    )

    const [selectedBooks, setSelectedBooks] = useState<string[]>(
        category?.books ? category.books.map((b: any) => b.bookId) : []
    )

    const [searchTerm, setSearchTerm] = useState('')

    const filteredBooks = books.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.author.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            const dataToSave = { ...formData, faq: JSON.stringify(faq) }
            let savedCategory
            if (category?.id) {
                const res = await saveSeoCategory(category.id, dataToSave)
                if (!res.success) throw new Error(res.error)
                savedCategory = res.category
            } else {
                const res = await createSeoCategory(dataToSave)
                if (!res.success) throw new Error(res.error)
                savedCategory = res.category
            }

            // Save books
            if (savedCategory) {
                await updateSeoCategoryBooks(savedCategory.id, selectedBooks)
            }

            router.push('/admin/seo-categories')
            router.refresh()
        } catch (error: any) {
            alert(error.message || 'Une erreur est survenue')
            setLoading(false)
        }
    }

    const toggleBook = (bookId: string) => {
        if (selectedBooks.includes(bookId)) {
            setSelectedBooks(selectedBooks.filter(id => id !== bookId))
        } else {
            setSelectedBooks([...selectedBooks, bookId])
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6">
            <div className="flex justify-between items-center mb-8">
                <Link href="/admin/seo-categories" className="text-gray-500 hover:text-gray-700 flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Retour
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informations Principales */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Informations Générales</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                            <select aria-label="Champ de sélection"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                value={formData.locale}
                                onChange={(e) => setFormData({...formData, locale: e.target.value})}
                            >
                                <option value="fr">Français</option>
                                <option value="ar">Arabe</option>
                                <option value="en">Anglais</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                value={formData.slug}
                                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titre (SEO)</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">H1 (Titre Principal)</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.h1}
                            onChange={(e) => setFormData({...formData, h1: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (SEO)</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot-clé principal</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.keyword}
                            onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                        />
                    </div>
                </div>

                {/* Contenu et Accueil */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Contenu et Affichage</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Introduction (Intro de la page)</label>
                        <textarea
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.intro}
                            onChange={(e) => setFormData({...formData, intro: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Texte de bas de page</label>
                        <textarea
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={formData.categoryText}
                            onChange={(e) => setFormData({...formData, categoryText: e.target.value})}
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="showOnHome"
                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                checked={formData.showOnHome}
                                onChange={(e) => setFormData({...formData, showOnHome: e.target.checked})}
                            />
                            <label htmlFor="showOnHome" className="ml-2 text-sm font-medium text-gray-900">
                                Afficher sur la page d'accueil (Bannière "Pack")
                            </label>
                        </div>
                        
                        {formData.showOnHome && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dégradé Tailwind (Ex: from-[#4A25E1] to-[#7A5AF8])</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    value={formData.colorGradient}
                                    onChange={(e) => setFormData({...formData, colorGradient: e.target.value})}
                                />
                                <div className="mt-2 h-8 rounded-lg" style={{ background: formData.colorGradient ? 'none' : '#ddd' }} className={`mt-2 h-8 rounded-lg bg-gradient-to-r ${formData.colorGradient}`}></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selection des livres */}
            <div className="mt-12 space-y-6">
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Livres de la Catégorie</h2>
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
                    <strong>Auto-assignation :</strong> Si vous ne sélectionnez aucun livre, le système cherchera les livres contenant ce mot-clé dans leur titre ou auteur :
                    <input
                        type="text"
                        placeholder="Ex: تطوير الذات"
                        className="ml-2 px-2 py-1 border border-blue-200 rounded"
                        value={formData.searchQuery}
                        onChange={(e) => setFormData({...formData, searchQuery: e.target.value})}
                    />
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher un livre à ajouter..."
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                    {filteredBooks.map(book => {
                        const isSelected = selectedBooks.includes(book.id)
                        return (
                            <div 
                                key={book.id} 
                                onClick={() => toggleBook(book.id)}
                                className={`cursor-pointer border-2 rounded-lg p-2 text-center transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white hover:border-gray-300'}`}
                            >
                                <div className="relative w-full aspect-[2/3] mb-2 rounded overflow-hidden">
                                    <Image src={book.image} alt={book.title} fill className="object-cover" />
                                </div>
                                <p className="text-xs font-bold line-clamp-1">{book.title}</p>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                                        ✓
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* FAQ */}
            <div className="mt-12 space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-lg font-bold text-gray-900">Questions Fréquemment Posées (FAQ)</h2>
                    <button
                        type="button"
                        onClick={() => setFaq([...faq, { q: '', a: '' }])}
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Ajouter une question
                    </button>
                </div>

                <div className="space-y-4">
                    {faq.map((item, index) => (
                        <div key={index} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Question</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={item.q}
                                        onChange={(e) => {
                                            const newFaq = [...faq]
                                            newFaq[index].q = e.target.value
                                            setFaq(newFaq)
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Réponse</label>
                                    <textarea
                                        rows={2}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={item.a}
                                        onChange={(e) => {
                                            const newFaq = [...faq]
                                            newFaq[index].a = e.target.value
                                            setFaq(newFaq)
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFaq(faq.filter((_, i) => i !== index))}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg mt-6"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {faq.length === 0 && (
                        <p className="text-gray-500 text-sm italic">Aucune question dans la FAQ.</p>
                    )}
                </div>
            </div>
        </form>
    )
}
