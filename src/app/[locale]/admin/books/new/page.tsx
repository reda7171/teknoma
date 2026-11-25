'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Bot, ClipboardPaste, Loader2, AlertCircle } from 'lucide-react'
import { createBook, fetchAllAuthors, type BookInput } from '@/lib/actions/books'
import { getPurchaseLots } from '@/lib/actions/finance'
import { getCategoryTree } from '@/lib/actions/category-tree'
import { publishBooksToJumia } from '@/lib/actions/jumia'
import type { CategoryTree } from '@/lib/constants/categories'
import ImageInput from '@/components/admin/ImageInput'

interface WarehouseStock {
    warehouseId: string
    name: string
    quantity: number
}

function hasInvisibleUnicode(val: string): boolean {
    return /[\u00A0\u200B-\u200D\uFEFF]/.test(val) || (val.length > 0 && val.trim() !== val)
}

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
    const [closeAfterSave, setCloseAfterSave] = useState(false)
    const [showJumiaModal, setShowJumiaModal] = useState(false)
    const [savedBookId, setSavedBookId] = useState<string | null>(null)
    const [pushToJumiaChoice, setPushToJumiaChoice] = useState<'yes' | 'no'>('yes')
    const [isPushingJumia, setIsPushingJumia] = useState(false)
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
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
    const [categoryTree, setCategoryTree] = useState<CategoryTree>({})
    const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])
    const [sellerSkuValue, setSellerSkuValue] = useState<string>('')
    const [hasSkuParasiteChars, setHasSkuParasiteChars] = useState<boolean>(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 6000)
            return () => clearTimeout(timer)
        }
    }, [toast])
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
        fetch('/api/admin/warehouses').then(res => res.json()).then(data => {
            setWarehouseStocks(data.map((w: any) => ({ warehouseId: w.id, name: w.name, quantity: 0 })))
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
                    const errData = await uploadResponse.json().catch(() => ({}));
                    throw new Error(errData.error || 'Erreur lors de l\'upload de l\'image')
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
            longDescription: formData.get('longDescription_ar') as string || undefined,
            longDescriptionFr: formData.get('longDescription_fr') as string || undefined,
            longDescriptionEn: formData.get('longDescription_en') as string || undefined,
            seoKeywords: formData.get('seoKeywords') as string || undefined,
            jumiaHighlights: formData.get('jumiaHighlights') as string || undefined,
            jumiaPackageContent: formData.get('jumiaPackageContent') as string || undefined,
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
            sellerSku: (formData.get('sellerSku') as string || '').replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, '').trim() || undefined,
            jumiaPriceMarkup: parseInt(formData.get('jumiaPriceMarkup') as string) || 0,
            isAffiliate: formData.get('isAffiliate') === 'true',
            affiliateLink: formData.get('affiliateLink') as string || undefined,
            condition: formData.get('condition') as any || 'NEW',
        }

        const result = await createBook(input)

        if (result.success) {
            // Créer les entrées de stock pour chaque entrepôt
            for (const ws of warehouseStocks) {
                if (ws.quantity > 0) {
                    await fetch('/api/admin/inventory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bookId: result.bookId,
                            warehouseId: ws.warehouseId,
                            quantity: ws.quantity,
                            note: 'Stock initial'
                        })
                    })
                }
            }

            // Show Jumia popup instead of routing immediately
            setSavedBookId(result.bookId)
            setShowJumiaModal(true)

        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    const handleJumiaConfirm = async () => {
        if (!savedBookId) return;

        if (pushToJumiaChoice === 'yes') {
            setIsPushingJumia(true);
            try {
                const res = await publishBooksToJumia([savedBookId]);
                if (res.success) {
                    alert(res.message || 'Produit publié avec succès sur Jumia');
                } else {
                    alert(res.message || 'Erreur lors de la publication');
                }
            } catch (err: any) {
                alert(err.message || 'Erreur lors de la publication');
            } finally {
                setIsPushingJumia(false);
            }
        }

        // Proceed to route
        setShowJumiaModal(false);
        if (closeAfterSave) {
            router.push('/admin/books');
        } else {
            router.push(`/admin/books/${savedBookId}/edit`);
        }
        router.refresh();
    }

    const copyChatGptPrompt = () => {
        const titleAr = (document.querySelector('input[name="title_ar"]') as HTMLInputElement)?.value || ''
        const titleFr = (document.querySelector('input[name="title_fr"]') as HTMLInputElement)?.value || ''
        const titleEn = (document.querySelector('input[name="title_en"]') as HTMLInputElement)?.value || ''
        const author = (document.querySelector('input[name="author"]') as HTMLInputElement)?.value || selectedAuthor || ''

        const title = titleFr || titleEn || titleAr || 'Nouveau Produit High-Tech'
        const auth = author || 'Marque officielle'

        const prompt = `Tu es un expert e-commerce et spécialiste high-tech pour la boutique en ligne Tekno Store (tekno.ma), leader de la vente de smartphones neufs, ordinateurs portables, Mac et accessoires au Maroc avec livraison express et paiement à la livraison COD.

Je souhaite ajouter le produit suivant à mon catalogue Tekno Store :
Marque / Fabricant : ${auth}
Titre / Modèle indicatif : ${title}

CONSIGNES STRICTES POUR TEKNO STORE :
1. Catégories autorisées (choisir impérativement une des catégories et sous-catégories officielles ci-dessous) :
   - "Smartphones" (sous-catégories : "Apple iPhone", "Samsung Galaxy", "Xiaomi", "Google Pixel", "Honor", "Accessoires Mobiles")
   - "PC Portables" (sous-catégories : "PC Gamer", "Ultrabooks", "PC Bureautique", "Workstations", "Écrans PC")
   - "Mac & Apple" (sous-catégories : "MacBook Air", "MacBook Pro", "iMac & Mac mini", "iPad Pro / Air", "Apple Watch")
   - "Accessoires" (sous-catégories : "Chargeurs & Câbles", "Coques & Protection", "Supports & Docks", "Claviers & Souris", "Adaptateurs")
   - "Audio" (sous-catégories : "Écouteurs sans fil", "Casques Bluetooth", "Enceintes portables", "Microphones")
   - "Stockage" (sous-catégories : "Disques SSD externes", "Disques durs externes", "Clés USB 3.2", "Cartes MicroSD")

2. Titres (FR, EN, AR) :
   - title_fr : Titre officiel précis (ex : "Apple iPhone 16 Pro 256 Go Titane Naturel", "SanDisk Extreme Pro MicroSDXC 256GB 200Mo/s", "Dell XPS 15 Intel Core i7 32 Go").
   - title_en : Titre complet en anglais.
   - title_ar : Titre précis et élégant en arabe.

3. Descriptions courtes (description_fr, description_en, description_ar) :
   - 2 à 3 paragraphes accrocheurs axés sur les performances réelles, la garantie 12 mois et la fiabilité.

4. Fiche technique longue (longDescription_fr, longDescription_en, longDescription_ar) :
   - Structurée avec des balises <h2> (ex : <h2>Performances et Puissance</h2>, <h2>Écran et Affichage</h2>, <h2>Connectivité et Autonomie</h2>) et des puces <ul><li>...</li></ul> détaillées.

5. Jumia Highlights & Package Content :
   - jumiaHighlights : Liste HTML stricte <ul><li>...</li></ul> avec les 4 à 6 spécifications majeures (ex : processeur, écran, autonomie, connectique).
   - jumiaPackageContent : Contenu exact du packaging (ex : "1 x Smartphone, 1 x Câble USB-C, 1 x Outil d'extraction SIM, 1 x Guide d'utilisation").

6. RÈGLE CRITIQUE PRIX :
   - NE JAMAIS mentionner de prix, de remises, de promotions ni de devises (DH, MAD, درهم) dans les descriptions ou highlights.

Réponds UNIQUEMENT avec un JSON valide, sans balises superflues, suivant ce format exact :
{
  "author": "${auth !== 'Marque officielle' ? auth : 'Apple'}",
  "title_ar": "العنوان بالعربية",
  "title_fr": "Titre officiel du produit en français",
  "title_en": "Official product title in English",
  "description_ar": "الوصف القصير باللغة العربية",
  "description_fr": "Description courte et engageante en français...",
  "description_en": "Short and engaging description in English...",
  "longDescription_ar": "<h2>المواصفات التقنية</h2><p>...</p>",
  "longDescription_fr": "<h2>Performances & Fiche Technique</h2><p>...</p><h2>Écran & Design</h2><p>...</p>",
  "longDescription_en": "<h2>Technical Specifications</h2><p>...</p>",
  "category": "Smartphones",
  "subCategory": "Apple iPhone",
  "seoKeywords": "tekno store, ${title}, prix maroc, high-tech maroc, livraison 24h",
  "jumiaHighlights": "<ul><li>Écran OLED haute résolution</li><li>Autonomie longue durée</li><li>Garantie constructeur 12M</li></ul>",
  "jumiaPackageContent": "1 x Appareil, 1 x Câble d'alimentation, 1 x Manuel d'utilisation",
  "isbn": "EAN ou référence constructeur si connue"
}`

        navigator.clipboard.writeText(prompt).then(() => {
            setToast({ message: 'Prompt ChatGPT Tekno Store copié dans le presse-papier !', type: 'success' })
        }).catch(() => {
            setToast({ message: 'Erreur lors de la copie dans le presse-papier.', type: 'error' })
        })
    }

    const pasteChatGptResponse = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text || !text.trim()) {
                setToast({ message: 'Le presse-papier est vide. Copiez d\'abord la réponse de ChatGPT.', type: 'error' })
                return
            }

            let clean = text.trim()
            clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
            const firstBrace = clean.indexOf('{')
            const lastBrace = clean.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                clean = clean.substring(firstBrace, lastBrace + 1)
            }

            let data: any
            try {
                data = JSON.parse(clean)
            } catch (e) {
                setToast({ message: 'Le contenu du presse-papier n\'est pas un JSON valide.', type: 'error' })
                return
            }

            const setInput = (name: string, value?: string) => {
                if (value !== undefined && value !== null) {
                    const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null
                    if (el) el.value = String(value)
                }
            }

            setInput('title_ar', data.title_ar)
            setInput('title_fr', data.title_fr)
            setInput('title_en', data.title_en)

            if (data.author) {
                setSelectedAuthor(data.author)
                setInput('author', data.author)
            }

            if (data.category) {
                setSelectedMainCategory(data.category)
                setInput('category', data.category)
            }

            if (data.subCategory) {
                setSelectedSubCategory(data.subCategory)
                setInput('subCategory', data.subCategory)
            }

            setInput('description_ar', data.description_ar)
            setInput('description_fr', data.description_fr)
            setInput('description_en', data.description_en)

            setInput('longDescription_ar', data.longDescription_ar)
            setInput('longDescription_fr', data.longDescription_fr)
            setInput('longDescription_en', data.longDescription_en)

            setInput('seoKeywords', data.seoKeywords)
            setInput('jumiaHighlights', data.jumiaHighlights)
            setInput('jumiaPackageContent', data.jumiaPackageContent)

            if (data.isbn) {
                setInput('isbn', data.isbn)
            }

            if (data.price && !isNaN(Number(data.price))) {
                setInput('price', String(data.price))
            }

            setToast({ message: 'Produit Tekno Store rempli avec succès depuis la réponse ChatGPT !', type: 'success' })
        } catch (err) {
            console.error(err)
            setToast({ message: 'Erreur lors de la lecture du presse-papier. Vérifiez les autorisations de votre navigateur.', type: 'error' })
        }
    }

    return (
        <div>
            {/* Custom Toast Notification */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 ${
                    toast.type === 'success' ? 'bg-[#0F172A] text-white border border-[#75C300]' :
                    toast.type === 'error' ? 'bg-red-600 text-white' :
                    'bg-blue-600 text-white'
                }`}>
                    {toast.type === 'success' && <span className="w-2.5 h-2.5 rounded-full bg-[#75C300]" />}
                    {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 text-xs">✕</button>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <Link
                        href="/admin/books"
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à la liste
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Ajouter un produit</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Remplissez les informations du nouveau produit Tekno Store
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <button
                        type="button"
                        onClick={copyChatGptPrompt}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg border border-slate-700 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
                        title="Copier le prompt IA configuré pour Tekno Store"
                    >
                        <Bot className="w-4 h-4 text-[#75C300]" />
                        Prompt ChatGPT
                    </button>
                    <button
                        type="button"
                        onClick={pasteChatGptResponse}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
                        title="Coller et injecter automatiquement les données JSON du produit"
                    >
                        <ClipboardPaste className="w-4 h-4" />
                        Coller réponse
                    </button>
                </div>
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
                            defaultValue={validLang === 'ar' ? prefillTitle : ''}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en arabe"
                        />
                        <input
                            type="text"
                            name="title_fr"
                            defaultValue={validLang === 'fr' ? prefillTitle : ''}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en français"
                        />
                        <input
                            type="text"
                            name="title_en"
                            defaultValue={validLang === 'en' ? prefillTitle : ''}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en anglais"
                        />
                    </div>

                    {/* Marque */}
                    <div className="relative" ref={authorInputRef}>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                            Marque <span className="text-red-500">*</span>
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
                            placeholder="Sélectionner ou saisir une marque..."
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
                                                Nouvelle marque: <span className="font-bold text-blue-600">{selectedAuthor}</span> sera créé
                                            </span>
                                        ) : (
                                            "Aucune marque trouvé"
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Saisissez pour chercher ou ajouter une nouvelle marque.</p>
                    </div>

                    {/* Numéro de Série / IMEI / Code-barres */}
                    <div>
                        <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
                            Numéro de série / IMEI / Code-barres
                        </label>
                        <input
                            type="text"
                            id="isbn"
                            name="isbn"
                            defaultValue={prefillIsbn}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Ex: 356938114526841 (IMEI) ou F2LW80... (S/N) ou code-barres"
                        />
                        <p className="text-xs text-gray-500 mt-1">Identifiant unique pour la garantie constructeur 12M et la traçabilité des commandes.</p>
                    </div>

                    {/* Seller SKU */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="sellerSku" className="block text-sm font-medium text-gray-700">
                                Seller SKU (Jumia)
                            </label>
                            {hasSkuParasiteChars && (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Caractères invisibles détectés (\u00A0)
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="sellerSku"
                                name="sellerSku"
                                value={sellerSkuValue}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setSellerSkuValue(val)
                                    setHasSkuParasiteChars(hasInvisibleUnicode(val))
                                }}
                                className={`flex-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                                    hasSkuParasiteChars
                                        ? 'border-amber-400 bg-amber-50/40 text-amber-950 focus:ring-amber-500'
                                        : 'border-gray-300 focus:ring-orange-500'
                                }`}
                                placeholder="SKU vendeur pour synchronisation"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newSku = `TEK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                                    setSellerSkuValue(newSku)
                                    setHasSkuParasiteChars(false)
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                            >
                                Générer
                            </button>
                        </div>

                        {hasSkuParasiteChars && (
                            <div className="mt-2.5 flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>
                                        Attention : des <strong>espaces invisibles Unicode (<code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">\u00A0</code>)</strong> sont présents. Cela bloque la recherche exacte sur Jumia Vendor.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleaned = sellerSkuValue.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, '').trim()
                                        setSellerSkuValue(cleaned)
                                        setHasSkuParasiteChars(false)
                                    }}
                                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                                >
                                    Nettoyer le SKU
                                </button>
                            </div>
                        )}
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
                        <select aria-label="Sélection jumiaPriceMarkup"
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
                                <select aria-label="Champ de sélection"
                                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500"
                                    onChange={(e) => {
                                        if (e.target.value) setSelectedCost(e.target.value)
                                    }}
                                >
                                    <option value="0">-- Choisir un lot ou saisir manuellement --</option>
                                    {lots.map(lot => (
                                        <option key={lot.id} value={lot.unitCost || 0}>
                                            {lot.title} ({new Date(lot.date).toLocaleDateString('fr-FR')}) {lot.unitCost ? `- ${lot.unitCost} درهم/produit` : ''}
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

                    {/* Stock (Géré par entrepôts) */}
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stock par entrepôt <span className="text-gray-400 font-normal">(Total: {warehouseStocks.reduce((a, b) => a + b.quantity, 0)})</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {warehouseStocks.map((ws, index) => (
                                <div key={ws.warehouseId} className="flex flex-col gap-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700 truncate">{ws.name}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={ws.quantity}
                                        onChange={(e) => {
                                            const newStocks = [...warehouseStocks]
                                            newStocks[index].quantity = parseInt(e.target.value) || 0
                                            setWarehouseStocks(newStocks)
                                        }}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                        <input type="hidden" name="stock" value={warehouseStocks.reduce((a, b) => a + b.quantity, 0)} />
                    </div>

                    {/* Catégorie et Sous-catégorie */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                Catégorie Principale
                            </label>
                            <select aria-label="Sélection category"
                                id="category"
                                name="category"
                                value={selectedMainCategory}
                                onChange={(e) => {
                                    setSelectedMainCategory(e.target.value)
                                    setSelectedSubCategory('')
                                }}
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
                            <select aria-label="Sélection subCategory"
                                id="subCategory"
                                name="subCategory"
                                value={selectedSubCategory}
                                onChange={(e) => setSelectedSubCategory(e.target.value)}
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

                    {/* Langue du Produit */}
                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-2">
                            Langue du Produit
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

                    {/* État du Produit */}
                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-2">
                            État du Produit
                        </legend>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="condition" value="NEW" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Neuf</span>
                            </label>
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="condition" value="GOOD" className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Bon état</span>
                            </label>
                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                <input type="radio" name="condition" value="USED" className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-900">Déjà utilisé</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* Produit Original */}
                    <div>
                        <label htmlFor="isOriginal" className="block text-sm font-medium text-gray-700 mb-2">
                            Type de Produit
                        </label>
                        <select aria-label="Sélection isOriginal"
                            id="isOriginal"
                            name="isOriginal"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="true" className="text-green-600 font-medium">✅ Produit Original</option>
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
                            <span className="font-bold text-orange-900">Ce produit est un produit d'affiliation (ex: Amazon)</span>
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
                            defaultValue={validLang === 'ar' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du produit en arabe..."
                        />
                        <textarea
                            name="description_fr"
                            defaultValue={validLang === 'fr' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du produit en français..."
                        />
                        <textarea
                            name="description_en"
                            defaultValue={validLang === 'en' ? prefillDescription : ''}
                            rows={4}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée du produit en anglais..."
                        />
                    </div>

                    {/* Description longue */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description longue
                            <span className="ml-2 text-xs text-gray-400 font-normal">(optionnel — affichée sur la page du produit)</span>
                        </label>
                        <textarea
                            name="longDescription_ar"
                            rows={8}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée, caract?ristiques, composition et conseils d’utilisation en arabe..."
                        />
                        <textarea
                            name="longDescription_fr"
                            rows={8}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Fiche technique détaillée, caractéristiques processeur, écran, autonomie, connectique en français..."
                        />
                        <textarea
                            name="longDescription_en"
                            rows={8}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Detailed technical specifications, processor, display, battery, connectivity in English..."
                        />
                    </div>

                    {/* Extrait / Documentation constructeur */}
                    <div className="md:col-span-2">
                        <label htmlFor="previewUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Fiche technique PDF / Documentation constructeur - Optionnel
                        </label>
                        <input
                            type="url"
                            id="previewUrl"
                            name="previewUrl"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: https://lien-vers-ma-fiche-technique.pdf"
                        />
                    </div>
                </div>

                {/* SEO Keywords */}
                <div className="mt-6">
                    <label htmlFor="seoKeywords" className="block text-sm font-medium text-gray-700 mb-2">
                        Mots-clés SEO (Séparés par des virgules)
                    </label>
                    <textarea
                        id="seoKeywords"
                        name="seoKeywords"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: smartphone maroc, iphone 16 pro maroc, 256go, oled 120hz, tekno store, prix maroc..."
                    />
                </div>

                {/* Jumia Highlights */}
                <div className="mt-6">
                    <label htmlFor="jumiaHighlights" className="block text-sm font-medium text-gray-700 mb-2">
                        Highlights Jumia (Description courte HTML)
                    </label>
                    <textarea
                        id="jumiaHighlights"
                        name="jumiaHighlights"
                        rows={3}
                        placeholder="<ul><li>Écran Super Retina XDR OLED 120Hz</li><li>Puce Apple A18 Pro 3nm</li><li>Garantie officielle 1 an</li></ul>"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Laisser vide pour utiliser la valeur par défaut. Recommandé : une liste HTML <code>&lt;ul&gt;&lt;li&gt;...&lt;/li&gt;&lt;/ul&gt;</code>
                    </p>
                </div>

                {/* Jumia Package Content */}
                <div className="mt-6">
                    <label htmlFor="jumiaPackageContent" className="block text-sm font-medium text-gray-700 mb-2">
                        Contenu du colis Jumia (What's in the box)
                    </label>
                    <input
                        type="text"
                        id="jumiaPackageContent"
                        name="jumiaPackageContent"
                        placeholder="1 x Smartphone, 1 x Câble USB-C, 1 x Outil SIM, 1 x Guide"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Exemple: "1 x Produit" ou "1 x Produit avec accessoire". Laisser vide pour la valeur par défaut.
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <Link
                        href="/admin/books"
                        className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Annuler
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        onClick={() => setCloseAfterSave(false)}
                        className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && !closeAfterSave ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        {loading && !closeAfterSave ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        onClick={() => setCloseAfterSave(true)}
                        className="inline-flex items-center px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && closeAfterSave ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        {loading && closeAfterSave ? 'Enregistrement...' : 'Enregistrer et Fermer'}
                    </button>
                </div>
            </form>

            {/* Jumia Push Modal */}
            {showJumiaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Produit enregistré avec succès</h3>
                            <p className="text-gray-600 mb-6">Voulez-vous publier ce produit sur Jumia maintenant ?</p>

                            <div className="space-y-4 mb-6">
                                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="pushJumia"
                                        value="yes"
                                        checked={pushToJumiaChoice === 'yes'}
                                        onChange={() => setPushToJumiaChoice('yes')}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 font-medium text-gray-900">Oui, publier sur Jumia</span>
                                </label>
                                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="pushJumia"
                                        value="no"
                                        checked={pushToJumiaChoice === 'no'}
                                        onChange={() => setPushToJumiaChoice('no')}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 font-medium text-gray-900">Non, plus tard</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handleJumiaConfirm}
                                    disabled={isPushingJumia}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPushingJumia ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                    {isPushingJumia ? 'Publication en cours...' : 'Valider'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
