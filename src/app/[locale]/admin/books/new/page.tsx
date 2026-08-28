'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { createBook, fetchAllAuthors, type BookInput } from '@/lib/actions/books'
import { getPurchaseLots } from '@/lib/actions/finance'
import { getCategoryTree } from '@/lib/actions/category-tree'
import type { CategoryTree } from '@/lib/constants/categories'
import ImageInput from '@/components/admin/ImageInput'

function BookFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const prefillTitle = searchParams.get('title') || ''
    const prefillAuthor = searchParams.get('author') || ''
    const prefillDescription = searchParams.get('description') || ''
    const prefillIsbn = searchParams.get('isbn') || ''
    const rawLang = (searchParams.get('lang') || 'fr').toLowerCase()
    let validLang: 'fr' | 'ar' | 'en' = 'fr'
    if (rawLang.startsWith('ar')) validLang = 'ar'
    else if (rawLang.startsWith('en')) validLang = 'en'
    else if (rawLang.startsWith('fr')) validLang = 'fr'

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lots, setLots] = useState<any[]>([])
    const [selectedCost, setSelectedCost] = useState<string>('0')
    const [authors, setAuthors] = useState<string[]>([])
    const [selectedAuthor, setSelectedAuthor] = useState<string>(prefillAuthor)
    const [isAuthorDropdownOpen, setIsAuthorDropdownOpen] = useState(false)
    const authorInputRef = useRef<HTMLDivElement>(null)
    const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>(validLang)
    const [bookLanguage, setBookLanguage] = useState<'ar' | 'fr' | 'en'>(validLang)
    const [selectedMainCategory, setSelectedMainCategory] = useState<string>('')
    const [categoryTree, setCategoryTree] = useState<CategoryTree>({})
    const mainCategories = Object.keys(categoryTree)

    useEffect(() => {
        getPurchaseLots().then(data => {
            setLots(data)
        }).catch(console.error)
        fetchAllAuthors().then(res => {
            if (res.success && res.data) setAuthors(res.data)
        }).catch(console.error)
        getCategoryTree().then(tree => {
            setCategoryTree(tree)
        }).catch(console.error)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (authorInputRef.current && !authorInputRef.current.contains(event.target as Node)) {
                setIsAuthorDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredAuthors = authors.filter(a => a.toLowerCase().includes(selectedAuthor.toLowerCase()))

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        // Gérer l'image (URL ou fichier uploadé)
        let imageUrl = formData.get('image') as string
        const imageFile = formData.get('imageFile') as File

        // Si un fichier est uploadé, le sauvegarder
        if (imageFile && imageFile.size > 0) {
            try {
                const uploadFormData = new FormData()
                uploadFormData.append('file', imageFile)

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData
                })

                if (!uploadResponse.ok) {
                    throw new Error('Erreur lors de l\'upload de l\'image')
                }

                const uploadResult = await uploadResponse.json()
                imageUrl = uploadResult.url
            } catch (err) {
                setError('Erreur lors de l\'upload de l\'image')
                setLoading(false)
                return
            }
        }

        const input: BookInput = {
            title: formData.get('title_ar') as string,
            titleFr: formData.get('title_fr') as string || undefined,
            titleEn: formData.get('title_en') as string || undefined,
            author: formData.get('author') as string,
            description: formData.get('description_ar') as string,
            descriptionFr: formData.get('description_fr') as string || undefined,
            descriptionEn: formData.get('description_en') as string || undefined,
            isbn: formData.get('isbn') as string || undefined,
            price: parseFloat(formData.get('price') as string),
            costPrice: parseFloat(formData.get('costPrice') as string) || 0,
            stock: parseInt(formData.get('stock') as string),
            image: imageUrl,
            category: formData.get('category') as string || undefined,
            subCategory: formData.get('subCategory') as string || undefined,
            language: formData.get('language') as string || 'fr',
            previewUrl: formData.get('previewUrl') as string || undefined,
            isOriginal: formData.get('isOriginal') !== 'false', // Par défaut true
            sellerSku: formData.get('sellerSku') as string || undefined,
            jumiaPriceMarkup: parseInt(formData.get('jumiaPriceMarkup') as string) || 0,
            isAffiliate: formData.get('isAffiliate') === 'true',
            affiliateLink: formData.get('affiliateLink') as string || undefined,
        }

        const result = await createBook(input)

        if (result.success) {
            router.push('/admin/books')
            router.refresh()
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/books"
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Ajouter un livre</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Remplissez les informations du nouveau livre
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-end mb-4 gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="lang_toggle" 
                            checked={currentLang === 'ar'} 
                            onChange={() => setCurrentLang('ar')} 
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className={`text-sm font-medium ${currentLang === 'ar' ? 'text-orange-500' : 'text-gray-500'}`}>Arabic</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="lang_toggle" 
                            checked={currentLang === 'fr'} 
                            onChange={() => setCurrentLang('fr')} 
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className={`text-sm font-medium ${currentLang === 'fr' ? 'text-orange-500' : 'text-gray-500'}`}>French</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="lang_toggle" 
                            checked={currentLang === 'en'} 
                            onChange={() => setCurrentLang('en')} 
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className={`text-sm font-medium ${currentLang === 'en' ? 'text-orange-500' : 'text-gray-500'}`}>English</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Titre */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Titre {bookLanguage === 'ar' ? '(Arabe)' : bookLanguage === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title_ar"
                            required={bookLanguage === 'ar'}
                            defaultValue={validLang === 'ar' ? prefillTitle : ''}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en arabe"
                        />
                        <input
                            type="text"
                            name="title_fr"
                            required={bookLanguage === 'fr'}
                            defaultValue={validLang === 'fr' ? prefillTitle : ''}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en français"
                        />
                        <input
                            type="text"
                            name="title_en"
                            required={bookLanguage === 'en'}
                            defaultValue={validLang === 'en' ? prefillTitle : ''}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en anglais"
                        />
                    </div>

                    {/* Auteur */}
                    <div className="relative" ref={authorInputRef}>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                            Auteur <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="author"
                            name="author"
                            required
                            value={selectedAuthor}
                            onChange={(e) => {
                                setSelectedAuthor(e.target.value);
                                setIsAuthorDropdownOpen(true);
                            }}
                            onFocus={() => setIsAuthorDropdownOpen(true)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Sélectionner ou saisir un auteur..."
                            autoComplete="off"
                        />
                        
                        {isAuthorDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredAuthors.length > 0 ? (
                                    <ul className="py-1">
                                        {filteredAuthors.map((author) => (
                                            <li
                                                key={author}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                                                onClick={() => {
                                                    setSelectedAuthor(author);
                                                    setIsAuthorDropdownOpen(false);
                                                }}
                                            >
                                                {author}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        {selectedAuthor ? (
                                            <span>
                                                Nouvel auteur: <span className="font-bold text-blue-600">{selectedAuthor}</span> sera créé
                                            </span>
                                        ) : (
                                            "Aucun auteur trouvé"
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Saisissez pour chercher ou ajouter un nouvel auteur.</p>
                    </div>

                    {/* ISBN */}
                    <div>
                        <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
                            ISBN
                        </label>
                        <input
                            type="text"
                            id="isbn"
                            name="isbn"
                            defaultValue={prefillIsbn}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 9780735211292"
                        />
                    </div>

                    {/* Seller SKU */}
                    <div>
                        <label htmlFor="sellerSku" className="block text-sm font-medium text-gray-700 mb-2">
                            Seller SKU (Jumia)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="sellerSku"
                                name="sellerSku"
                                className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="SKU vendeur pour synchronisation"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const input = document.getElementById('sellerSku') as HTMLInputElement;
                                    if (input) input.value = `RIW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                            >
                                Générer
                            </button>
                        </div>
                    </div>

                    {/* Prix */}
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                            Prix de Vente (درهم) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="price"
                            name="price"
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="150"
                        />
                    </div>

                    {/* Pourcentage Jumia */}
                    <div>
                        <label htmlFor="jumiaPriceMarkup" className="block text-sm font-medium text-gray-700 mb-2">
                            Pourcentage à ajouter (Prix Jumia)
                        </label>
                        <select
                            id="jumiaPriceMarkup"
                            name="jumiaPriceMarkup"
                            defaultValue={0}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="0">0% (Aucun ajout)</option>
                            <option value="10">10%</option>
                            <option value="20">20%</option>
                            <option value="30">30%</option>
                            <option value="40">40%</option>
                            <option value="50">50%</option>
                            <option value="60">60%</option>
                            <option value="70">70%</option>
                            <option value="80">80%</option>
                            <option value="90">90%</option>
                            <option value="100">100%</option>
                        </select>
                    </div>

                    {/* Coût de revient (Pour Marge) */}
                    <div className="md:col-span-2 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                            Coût de revient / Achat (Sert à calculer la marge finale !!)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Associer depuis un Lot d'Achats</label>
                                <select 
                                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500"
                                    onChange={(e) => {
                                        if (e.target.value) setSelectedCost(e.target.value)
                                    }}
                                >
                                    <option value="0">-- Choisir un lot ou saisir manuellement --</option>
                                    {lots.map(lot => (
                                        <option key={lot.id} value={lot.unitCost || 0}>
                                            {lot.title} ({new Date(lot.date).toLocaleDateString('fr-FR')}) {lot.unitCost ? `- ${lot.unitCost} درهم/livre` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="costPrice" className="block text-xs font-bold text-gray-600 mb-1">
                                    Coût unitaire appliqué (درهم)
                                </label>
                                <input
                                    type="number"
                                    id="costPrice"
                                    name="costPrice"
                                    min="0"
                                    step="0.01"
                                    value={selectedCost}
                                    onChange={(e) => setSelectedCost(e.target.value)}
                                    className="w-full px-4 py-2 border border-orange-300 bg-white rounded-lg focus:ring-2 focus:ring-orange-500 font-black text-orange-700"
                                    placeholder="Ex: 50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock */}
                    <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                            Stock <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="stock"
                            name="stock"
                            required
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="50"
                        />
                    </div>

                    {/* Catégorie et Sous-catégorie */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                Catégorie Principale
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={selectedMainCategory}
                                onChange={(e) => setSelectedMainCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Sélectionner une catégorie</option>
                                {mainCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-2">
                                Sous-catégorie
                            </label>
                            <select
                                id="subCategory"
                                name="subCategory"
                                disabled={!selectedMainCategory}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value="">Sélectionner une sous-catégorie</option>
                                {selectedMainCategory && categoryTree[selectedMainCategory]?.map(subCat => (
                                    <option key={subCat} value={subCat}>{subCat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Langue du Livre */}
                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-2">
                            Langue du Livre
                        </legend>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="language" value="fr" checked={bookLanguage === 'fr'} onChange={(e) => { setBookLanguage('fr'); setCurrentLang('fr'); }} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Français</span>
                            </label>
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="language" value="ar" checked={bookLanguage === 'ar'} onChange={(e) => { setBookLanguage('ar'); setCurrentLang('ar'); }} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Arabe</span>
                            </label>
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="language" value="en" checked={bookLanguage === 'en'} onChange={(e) => { setBookLanguage('en'); setCurrentLang('en'); }} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Anglais</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* Livre Original */}
                    <div>
                        <label htmlFor="isOriginal" className="block text-sm font-medium text-gray-700 mb-2">
                            Type de Livre
                        </label>
                        <select
                            id="isOriginal"
                            name="isOriginal"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="true" className="text-green-600 font-medium">✅ Livre Original</option>
                            <option value="false" className="text-red-600 font-medium">❌ Copie / Reproduction</option>
                        </select>
                    </div>
                    {/* Affiliation Amazon */}
                    <div className="md:col-span-2 bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isAffiliate"
                                value="true"
                                className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            />
                            <span className="font-bold text-orange-900">Ce livre est un produit d'affiliation (ex: Amazon)</span>
                        </label>
                        
                        <div>
                            <label htmlFor="affiliateLink" className="block text-sm font-medium text-gray-700 mb-2">
                                Lien d'affiliation (URL complète)
                            </label>
                            <input
                                type="url"
                                id="affiliateLink"
                                name="affiliateLink"
                                className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="https://amzn.to/..."
                            />
                        </div>
                    </div>

                    {/* Image */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image <span className="text-red-500">*</span>
                        </label>
                        <ImageInput defaultValue={searchParams.get('cover') || undefined} />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description {bookLanguage === 'ar' ? '(Arabe)' : bookLanguage === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="description_ar"
                            required={bookLanguage === 'ar'}
                            defaultValue={validLang === 'ar' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du livre en arabe..."
                        />
                        <textarea
                            name="description_fr"
                            required={bookLanguage === 'fr'}
                            defaultValue={validLang === 'fr' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du livre en français..."
                        />
                        <textarea
                            name="description_en"
                            required={bookLanguage === 'en'}
                            defaultValue={validLang === 'en' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du livre en anglais..."
                        />
                    </div>

                    {/* Extrait de Lecture (previewUrl) */}
                    <div className="md:col-span-2">
                        <label htmlFor="previewUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Lien d'extrait (PDF / Google Drive) - Optionnel
                        </label>
                        <input
                            type="url"
                            id="previewUrl"
                            name="previewUrl"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: https://lien-vers-mon-pdf.com"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-4">
                    <Link
                        href="/admin/books"
                        className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Annuler
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default function BookForm() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}>
            <BookFormContent />
        </Suspense>
    )
}
