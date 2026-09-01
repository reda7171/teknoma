'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Languages } from 'lucide-react'
import { getBookById, updateBook, fetchAllAuthors, type BookInput } from '@/lib/actions/books'
import { getPurchaseLots } from '@/lib/actions/finance'
import { publishBooksToJumia, checkJumiaLinkBySkuExact, syncBooksQuantityToJumia } from '@/lib/actions/jumia'
import ImageInput from '@/components/admin/ImageInput'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { ImageIcon, Link2, ExternalLink } from 'lucide-react'
import { getCategoryTree } from '@/lib/actions/category-tree'
import type { CategoryTree } from '@/lib/constants/categories'

export default function EditBookPage({ params, searchParams }: { params: Promise<{ id: string, locale: string }>, searchParams: Promise<{ page?: string, search?: string, filter?: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const resolvedSearchParams = use(searchParams)
    const bookId = resolvedParams.id
    
    // Construction de l'URL de retour
    const returnUrlParams = new URLSearchParams()
    if (resolvedSearchParams.page) returnUrlParams.set('page', resolvedSearchParams.page)
    if (resolvedSearchParams.search) returnUrlParams.set('search', resolvedSearchParams.search)
    if (resolvedSearchParams.filter) returnUrlParams.set('filter', resolvedSearchParams.filter)
    const returnUrl = `/admin/books${returnUrlParams.toString() ? `?${returnUrlParams.toString()}` : ''}`

    const [id, setId] = useState<string>(bookId)
    const [loading, setLoading] = useState(false)
    const [isPushingJumia, setIsPushingJumia] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [isSyncingQuantity, setIsSyncingQuantity] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [book, setBook] = useState<any>(null)
    const [lots, setLots] = useState<any[]>([])
    const [selectedCost, setSelectedCost] = useState<string>('0')

    const [bookImage, setBookImage] = useState<string>('')
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    
    // Nouveaux states pour les champs gérés avec Gemini
    const [description, setDescription] = useState<string>('')
    const [descriptionFr, setDescriptionFr] = useState<string>('')
    const [descriptionEn, setDescriptionEn] = useState<string>('')
    const [longDescription, setLongDescription] = useState<string>('')
    const [longDescriptionFr, setLongDescriptionFr] = useState<string>('')
    const [longDescriptionEn, setLongDescriptionEn] = useState<string>('')
    const [isGeneratingShort, setIsGeneratingShort] = useState(false)
    const [isGeneratingLong, setIsGeneratingLong] = useState(false)
    const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false)
    const [isGeneratingContent, setIsGeneratingContent] = useState(false)
    const [authors, setAuthors] = useState<string[]>([])
    const [isNewAuthor, setIsNewAuthor] = useState(false)
    const [selectedAuthor, setSelectedAuthor] = useState<string>('')
    const [currentLang, setCurrentLang] = useState<'ar' | 'fr'>('ar')
    const [bookLanguage, setBookLanguage] = useState<'ar' | 'fr' | 'en'>('fr')
    const [isLinked, setIsLinked] = useState<boolean | null>(null)
    const [closeAfterSave, setCloseAfterSave] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translateMsg, setTranslateMsg] = useState<string | null>(null)
    const [selectedMainCategory, setSelectedMainCategory] = useState<string>('')
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
    const [categoryTree, setCategoryTree] = useState<CategoryTree>({})
    const mainCategories = Object.keys(categoryTree)

    useEffect(() => {
        getPurchaseLots().then(data => setLots(data)).catch(console.error)
        fetchAllAuthors().then(res => {
            if (res.success && res.data) setAuthors(res.data)
        }).catch(console.error)
        getCategoryTree().then(tree => setCategoryTree(tree)).catch(console.error)
    }, [])

    // Traduction automatique via DeepL (titre + description arabe -> FR + EN)
    const handleAutoTranslate = async () => {
        if (!book) return
        const titleAr = (document.querySelector('input[name="title_ar"]') as HTMLInputElement)?.value || book.title
        const descAr = description || book.description
        if (!titleAr && !descAr) {
            setTranslateMsg('Aucun texte arabe à traduire.')
            return
        }
        setIsTranslating(true)
        setTranslateMsg(null)
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'book', title: titleAr, description: descAr, sourceLang: 'AR' })
            })
            const data = await res.json()
            if (data.titleFr) {
                const inputFr = document.querySelector('input[name="title_fr"]') as HTMLInputElement
                if (inputFr) inputFr.value = data.titleFr
            }
            if (data.titleEn) {
                const inputEn = document.querySelector('input[name="title_en"]') as HTMLInputElement
                if (inputEn) inputEn.value = data.titleEn
            }
            if (data.descriptionFr) setDescriptionFr(data.descriptionFr)
            if (data.descriptionEn) setDescriptionEn(data.descriptionEn)
            const errs = data.errors?.filter(Boolean) || []
            setTranslateMsg(errs.length > 0 ? `Partiel: ${errs.join(', ')}` : 'Traduit avec succès ! Vérifiez et sauvegardez.')
        } catch (e: any) {
            setTranslateMsg(`Erreur: ${e.message}`)
        } finally {
            setIsTranslating(false)
        }
    }

    useEffect(() => {
        if (bookId) {
            loadBook(bookId)
        }
    }, [bookId])

    async function loadBook(bookId: string) {
        setLoadingData(true)
        try {
            const result = await getBookById(bookId)

            if (result.success && result.data) {
                setBook(result.data)
                setSelectedCost((result.data as any).costPrice?.toString() || '0')
                setDescription(result.data.description || '')
                setDescriptionFr(result.data.descriptionFr || '')
                setDescriptionEn(result.data.descriptionEn || '')
                setLongDescription(result.data.longDescription || '')
                setLongDescriptionFr(result.data.longDescriptionFr || '')
                setLongDescriptionEn(result.data.longDescriptionEn || '')
                setSelectedAuthor(result.data.author || '')
                setCurrentLang(result.data.language === 'en' ? 'en' : result.data.language === 'fr' ? 'fr' : 'ar')
                setBookLanguage((result.data.language as 'ar' | 'fr' | 'en') || 'fr')
                setBookImage(result.data.image || '')
                setSelectedMainCategory(result.data.category || '')
                setSelectedSubCategory(result.data.subCategory || '')
                
                if (result.data.sellerSku) {
                    console.log('Checking Jumia link for SKU:', result.data.sellerSku);
                    checkJumiaLinkBySkuExact(result.data.sellerSku, (result.data as any).jumiaProductSid).then(linked => {
                        console.log('Jumia link check result:', linked);
                        setIsLinked(linked)
                    }).catch(err => {
                        console.error('Error checking Jumia link:', err);
                        setIsLinked(false)
                    })
                } else {
                    console.log('No sellerSku for this book');
                    setIsLinked(false)
                }
            } else {
                setError(result.error || 'Livre introuvable')
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Livre introuvable')
        }
        setLoadingData(false)
    }

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
            author: selectedAuthor,
            description: description,
            descriptionFr: descriptionFr || undefined,
            descriptionEn: formData.get('description_en') as string || undefined,
            longDescription: longDescription || undefined,
            longDescriptionFr: longDescriptionFr || undefined,
            longDescriptionEn: longDescriptionEn || undefined,
            isbn: formData.get('isbn') as string || undefined,
            price: parseFloat(formData.get('price') as string),
            costPrice: parseFloat(formData.get('costPrice') as string) || 0,
            stock: parseInt(formData.get('stock') as string),
            image: imageUrl || bookImage,
            category: formData.get('category') as string || undefined,
            subCategory: formData.get('subCategory') as string || undefined,
            language: formData.get('language') as string || 'fr',
            active: formData.get('active') === 'true',
            status: formData.get('status') as string || 'APPROVED',
            isBestSeller: formData.get('isBestSeller') === 'true',
            previewUrl: formData.get('previewUrl') as string || undefined,
            isOriginal: formData.get('isOriginal') !== 'false',
            sellerSku: formData.get('sellerSku') as string || undefined,
            jumiaPriceMarkup: parseInt(formData.get('jumiaPriceMarkup') as string) || 0,
            isSyncedWithJumia: formData.get('isSyncedWithJumia') === 'true',
            jumiaHighlights: formData.get('jumiaHighlights') as string || undefined,
            jumiaPackageContent: formData.get('jumiaPackageContent') as string || undefined,
            jumiaProductSid: formData.get('jumiaProductSid') as string || undefined,
            isAffiliate: formData.get('isAffiliate') === 'true',
            affiliateLink: formData.get('affiliateLink') as string || undefined,
            seoKeywords: formData.get('seoKeywords') as string || undefined,
        }

        const result = await updateBook(id, input)

        if (result.success) {
            if (closeAfterSave) {
                router.push(returnUrl)
                router.refresh()
            } else {
                setLoading(false)
                // Recharger les données du livre sans quitter la page
                await loadBook(id)
            }
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    async function handlePushToJumia() {
        if (!bookId) return
        if (!confirm('Voulez-vous vraiment publier ce livre sur Jumia ?')) return
        
        setIsPushingJumia(true)
        try {
            const res = await publishBooksToJumia([bookId])
            if (res.success) {
                alert(res.message || 'Livre publié avec succès sur Jumia')
            } else {
                alert(res.message || 'Erreur lors de la publication')
            }
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la publication')
        } finally {
            setIsPushingJumia(false)
        }
    }

    async function handleSyncQuantity() {
        if (!bookId) return
        
        setIsSyncingQuantity(true)
        try {
            const res = await syncBooksQuantityToJumia([bookId])
            if (res.success) {
                alert(res.message || 'Quantité synchronisée avec succès')
                // Recharger les données
                await loadBook(bookId)
            } else {
                alert(res.message || 'Erreur lors de la synchronisation')
            }
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la synchronisation')
        } finally {
            setIsSyncingQuantity(false)
        }
    }

    const improveShortDescription = async () => {
        let textToImprove = '';
        let targetLang = '';
        if (currentLang === 'ar') { textToImprove = description; targetLang = 'AR'; }
        else if (currentLang === 'fr') { textToImprove = descriptionFr; targetLang = 'FR'; }
        else if (currentLang === 'en') { textToImprove = descriptionEn; targetLang = 'EN'; }
        
        if (!textToImprove) {
            alert('Veuillez d\'abord écrire une description à améliorer.');
            return;
        }
        setIsGeneratingShort(true);
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToImprove, targetLang })
            });
            const data = await res.json();
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                const improved = data.rephrased[0];
                if (currentLang === 'ar') setDescription(improved);
                else if (currentLang === 'fr') setDescriptionFr(improved);
                else if (currentLang === 'en') setDescriptionEn(improved);
            } else {
                alert(data.error || 'Erreur lors de l\'amélioration.');
            }
        } catch (err) {
            console.error(err);
            alert('Erreur réseau lors de l\'amélioration.');
        } finally {
            setIsGeneratingShort(false);
        }
    }

    const improveLongDescription = async () => {
        let textToImprove = '';
        let targetLang = '';
        if (currentLang === 'ar') { textToImprove = longDescription; targetLang = 'AR'; }
        else if (currentLang === 'fr') { textToImprove = longDescriptionFr; targetLang = 'FR'; }
        else if (currentLang === 'en') { textToImprove = longDescriptionEn; targetLang = 'EN'; }
        
        if (!textToImprove) {
            alert('Veuillez d\'abord écrire une description longue à améliorer.');
            return;
        }
        setIsGeneratingLong(true);
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToImprove, targetLang })
            });
            const data = await res.json();
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                const improved = data.rephrased[0];
                if (currentLang === 'ar') setLongDescription(improved);
                else if (currentLang === 'fr') setLongDescriptionFr(improved);
                else if (currentLang === 'en') setLongDescriptionEn(improved);
            } else {
                alert(data.error || 'Erreur lors de l\'amélioration.');
            }
        } catch (err) {
            console.error(err);
            alert('Erreur réseau lors de l\'amélioration.');
        } finally {
            setIsGeneratingLong(false);
        }
    }

    const generateHighlightsAI = async () => {
        const titleInput = (document.getElementById('title') as HTMLInputElement)?.value || book?.title;
        if (!titleInput) return alert('Veuillez saisir un titre pour le livre');
        
        const el = document.getElementById('jumiaHighlights') as HTMLTextAreaElement;
        let textToImprove = el?.value?.trim();
        
        if (!textToImprove) {
            textToImprove = `<ul><li>Titre: ${titleInput}</li><li>Format: Livre papier</li></ul>`;
            el.value = textToImprove;
            return;
        }
        
        setIsGeneratingHighlights(true);
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'texts', texts: [textToImprove], targetLang: 'FR' })
            });
            const data = await res.json();
            if (data.success && data.translations && data.translations[0]) {
                if (el) el.value = data.translations[0];
            } else if (data.error) {
                alert('Erreur DeepL: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la traduction');
        } finally {
            setIsGeneratingHighlights(false);
        }
    }

    const generateContentAI = async () => {
        const titleInput = (document.getElementById('title') as HTMLInputElement)?.value || book?.title;
        if (!titleInput) return alert('Veuillez saisir un titre pour le livre');
        
        const el = document.getElementById('jumiaPackageContent') as HTMLInputElement;
        let textToImprove = el?.value?.trim();
        
        if (!textToImprove) {
            textToImprove = `1 x Livre : ${titleInput}`;
        }
        
        setIsGeneratingContent(true);
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'texts', texts: [textToImprove], targetLang: 'FR' })
            });
            const data = await res.json();
            if (data.success && data.translations && data.translations[0]) {
                if (el) el.value = data.translations[0];
            } else if (data.error) {
                alert('Erreur DeepL: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la traduction');
        } finally {
            setIsGeneratingContent(false);
        }
    }

    if (loadingData) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-gray-500">Chargement...</div>
            </div>
        )
    }

    if (!book) {
        return (
            <div>
                <div className="mb-8">
                    <Link
                        href={returnUrl}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à la liste
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Livre introuvable</h1>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error || 'Ce livre n\'existe pas'}</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={returnUrl}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900">Modifier le livre</h1>
                            {isLinked !== null && (
                                isLinked ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">
                                        <Link2 className="w-3 h-3 mr-1" />
                                        Linké
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">
                                        Non Linké
                                    </span>
                                )
                            )}
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Modifiez les informations du livre "{book.title}"
                        </p>
                    </div>
                    <a
                        href={`/${resolvedParams.locale}/books/${bookId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir sur le site
                    </a>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Form */}
            <form key={book.id} onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
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
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Titre {bookLanguage === 'ar' ? '(Arabe)' : bookLanguage === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleAutoTranslate}
                                disabled={isTranslating}
                                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                title="Traduire le titre et la description (arabe -> FR + EN) via DeepL"
                            >
                                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                                {isTranslating ? 'Traduction...' : 'Traduire avec DeepL'}
                            </button>
                        </div>
                        {translateMsg && (
                            <p className={`text-xs mb-2 px-3 py-1.5 rounded ${translateMsg.includes('Erreur') || translateMsg.includes('Partiel') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                {translateMsg}
                            </p>
                        )}
                        <input
                            type="text"
                            id="title"
                            name="title_ar"
                            required={bookLanguage === 'ar'}
                            defaultValue={book.title}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en arabe"
                        />
                        <input
                            type="text"
                            name="title_fr"
                            required={bookLanguage === 'fr'}
                            defaultValue={book.titleFr || ''}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en français"
                        />
                        <input
                            type="text"
                            name="title_en"
                            required={bookLanguage === 'en'}
                            defaultValue={book.titleEn || ''}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Titre en anglais"
                        />
                    </div>

                    {/* Auteur */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                                Auteur <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsNewAuthor(!isNewAuthor)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                            >
                                {isNewAuthor ? "Choisir existant" : "+ Nouvel auteur"}
                            </button>
                        </div>
                        {isNewAuthor ? (
                            <input
                                type="text"
                                id="author"
                                name="author"
                                required
                                defaultValue={selectedAuthor}
                                onChange={(e) => setSelectedAuthor(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Saisir le nom du nouvel auteur"
                            />
                        ) : (
                            <select
                                id="author"
                                name="author"
                                required
                                value={selectedAuthor}
                                onChange={(e) => {
                                    if (e.target.value === 'NEW') {
                                        setIsNewAuthor(true);
                                        setSelectedAuthor('');
                                    } else {
                                        setSelectedAuthor(e.target.value);
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="" disabled>Sélectionner un auteur</option>
                                {authors.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                                {/* Assurer que l'auteur actuel est dans la liste s'il a été supprimé des autres livres */}
                                {selectedAuthor && !authors.includes(selectedAuthor) && selectedAuthor !== 'NEW' && (
                                    <option value={selectedAuthor}>{selectedAuthor}</option>
                                )}
                                <option value="NEW" className="font-bold text-blue-600">+ Ajouter un nouvel auteur...</option>
                            </select>
                        )}
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
                            defaultValue={book.isbn || ''}
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
                                defaultValue={book.sellerSku || ''}
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
                            defaultValue={book.price}
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
                            defaultValue={book.jumiaPriceMarkup || 0}
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
                            defaultValue={book.stock}
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
                            <select
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

                    {/* Visibilité (Actif/Inactif) */}
                    <div>
                        <label htmlFor="active" className="block text-sm font-medium text-gray-700 mb-2">
                            Visibilité Publique
                        </label>
                        <select
                            id="active"
                            name="active"
                            defaultValue={book.active ? 'true' : 'false'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="true" className="text-green-600 font-medium">✅ Actif (Visible sur le site)</option>
                            <option value="false" className="text-gray-500 font-medium">❌ Inactif (Masqué)</option>
                        </select>
                    </div>

                    {/* Statut Administratif */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                            Statut Administratif
                        </label>
                        <select
                            id="status"
                            name="status"
                            defaultValue={book.status || 'APPROVED'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="APPROVED">Approuvé (APPROVED)</option>
                            <option value="PENDING">En attente d'approbation (PENDING)</option>
                            <option value="REJECTED">Rejeté (REJECTED)</option>
                        </select>
                    </div>

                    {/* Meilleure Vente */}
                    <div>
                        <label htmlFor="isBestSeller" className="block text-sm font-medium text-gray-700 mb-2">
                            Mettre en "Meilleure Vente"
                        </label>
                        <select
                            id="isBestSeller"
                            name="isBestSeller"
                            defaultValue={book.isBestSeller ? 'true' : 'false'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="false" className="text-gray-500 font-medium">Non</option>
                            <option value="true" className="text-orange-600 font-medium">⭐ Oui (Meilleure Vente)</option>
                        </select>
                    </div>

                    {/* Livre Original */}
                    <div>
                        <label htmlFor="isOriginal" className="block text-sm font-medium text-gray-700 mb-2">
                            Type de Livre
                        </label>
                        <select
                            id="isOriginal"
                            name="isOriginal"
                            defaultValue={book.isOriginal ? 'true' : 'false'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="true" className="text-green-600 font-medium">✅ Livre Original</option>
                            <option value="false" className="text-red-600 font-medium">❌ Copie / Reproduction</option>
                        </select>
                    </div>

                    {/* Synchronisé Jumia */}
                    <div>
                        <label htmlFor="isSyncedWithJumia" className="block text-sm font-medium text-gray-700 mb-2">
                            Synchronisé Jumia
                        </label>
                        <select
                            id="isSyncedWithJumia"
                            name="isSyncedWithJumia"
                            defaultValue={book.isSyncedWithJumia ? 'true' : 'false'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        >
                            <option value="true" className="text-green-600 font-medium">✅ Oui (Synchronisé)</option>
                            <option value="false" className="text-gray-500 font-medium">❌ Non (Pas encore)</option>
                        </select>
                    </div>

                    {/* Affiliation Amazon */}
                    <div className="md:col-span-2 bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isAffiliate"
                                value="true"
                                defaultChecked={book.isAffiliate}
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
                                defaultValue={book.affiliateLink || ''}
                                className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="https://amzn.to/..."
                            />
                        </div>
                    </div>

                    {/* Jumia Highlights */}
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="jumiaHighlights" className="block text-sm font-medium text-gray-700">
                                Highlights Jumia (Description courte HTML)
                            </label>
                            <button type="button" onClick={generateHighlightsAI} disabled={isGeneratingHighlights} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                {isGeneratingHighlights ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL'}
                            </button>
                        </div>
                        <textarea
                            id="jumiaHighlights"
                            name="jumiaHighlights"
                            rows={3}
                            defaultValue={book.jumiaHighlights || ''}
                            placeholder={`<ul><li>Titre: ${book.title}</li><li>Auteur: ${book.author}</li><li>Type: Livre</li></ul>`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Laisser vide pour utiliser la valeur par défaut. Recommandé : une liste HTML <code>&lt;ul&gt;&lt;li&gt;...&lt;/li&gt;&lt;/ul&gt;</code>
                        </p>
                    </div>

                    {/* Jumia Package Content */}
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="jumiaPackageContent" className="block text-sm font-medium text-gray-700">
                                Contenu du colis Jumia (What's in the box)
                            </label>
                            <button type="button" onClick={generateContentAI} disabled={isGeneratingContent} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                {isGeneratingContent ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL'}
                            </button>
                        </div>
                        <input
                            type="text"
                            id="jumiaPackageContent"
                            name="jumiaPackageContent"
                            defaultValue={book.jumiaPackageContent || ''}
                            placeholder={`1 x Livre : ${book.title}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Exemple: "1 x Livre" ou "1 x Livre avec marque-page". Laisser vide pour la valeur par défaut.
                        </p>
                    </div>

                    {/* Image URL ou Upload */}
                    <div className="md:col-span-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Image <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMediaModalOpen(true)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                                >
                                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Parcourir la Médiathèque
                                </button>
                            </div>
                        </div>
                        <ImageInput defaultValue={bookImage} bookTitle={book.title} />
                        {bookImage && (
                            <div className="mt-4 flex justify-center">
                                <img src={bookImage} alt={book.title} className="w-full max-w-sm rounded-lg shadow-sm border border-gray-100 object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Description courte */}
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Description courte {bookLanguage === 'ar' ? '(Arabe)' : bookLanguage === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={improveShortDescription} disabled={isGeneratingShort} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                {isGeneratingShort ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL (Améliorer)'}
                            </button>
                        </div>
                        <textarea
                            name="description_ar"
                            required={bookLanguage === 'ar'}
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description courte du livre en arabe..."
                        />
                        <textarea
                            name="description_fr"
                            required={bookLanguage === 'fr'}
                            rows={4}
                            value={descriptionFr}
                            onChange={(e) => setDescriptionFr(e.target.value)}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description courte du livre en français..."
                        />
                        <textarea
                            name="description_en"
                            required={bookLanguage === 'en'}
                            rows={4}
                            value={descriptionEn}
                            onChange={(e) => setDescriptionEn(e.target.value)}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description courte du livre en anglais..."
                        />
                    </div>

                    {/* Description longue */}
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Description longue
                                <span className="ml-2 text-xs text-gray-400 font-normal">(optionnel — affichée sur la page du livre)</span>
                            </label>
                            <button type="button" onClick={improveLongDescription} disabled={isGeneratingLong} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                {isGeneratingLong ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL (Améliorer)'}
                            </button>
                        </div>
                        <textarea
                            name="longDescription_ar"
                            rows={8}
                            value={longDescription}
                            onChange={(e) => setLongDescription(e.target.value)}
                            style={{ display: currentLang === 'ar' ? 'block' : 'none', direction: 'rtl' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée, biographie de l'auteur, contexte du livre en arabe..."
                        />
                        <textarea
                            name="longDescription_fr"
                            rows={8}
                            value={longDescriptionFr}
                            onChange={(e) => setLongDescriptionFr(e.target.value)}
                            style={{ display: currentLang === 'fr' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Description détaillée, biographie de l'auteur, contexte du livre en français..."
                        />
                        <textarea
                            name="longDescription_en"
                            rows={8}
                            value={longDescriptionEn}
                            onChange={(e) => setLongDescriptionEn(e.target.value)}
                            style={{ display: currentLang === 'en' ? 'block' : 'none' }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Detailed description, author biography, book context in english..."
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
                            defaultValue={book.previewUrl || ''}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: https://lien-vers-mon-pdf.com"
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
                        defaultValue={book.seoKeywords || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: roman policier, agatha christie, meurtre mystère..."
                    />
                </div>

                {/* SID JUMIA */}
                <div className="mt-6">
                    <label htmlFor="jumiaProductSid" className="block text-sm font-medium text-gray-700 mb-2">
                        SID JUMIA
                    </label>
                    <input
                        type="text"
                        id="jumiaProductSid"
                        name="jumiaProductSid"
                        defaultValue={book.jumiaProductSid || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                        placeholder="SID généré par Jumia"
                    />
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between gap-4">
                    {/* Gauche : Push to Jumia et Synch */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handlePushToJumia}
                            disabled={isPushingJumia || loading || isSyncingQuantity}
                            className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {isPushingJumia ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                            Push to Jumia
                        </button>
                        <button
                            type="button"
                            onClick={handleSyncQuantity}
                            disabled={isSyncingQuantity || loading || isPushingJumia}
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {isSyncingQuantity ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                            Synch quantity
                        </button>
                    </div>
                    
                    {/* Droite : Annuler / Enregistrer / Enregistrer et Fermer */}
                    <div className="flex items-center gap-3">
                        <Link
                            href={returnUrl}
                            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || isPushingJumia}
                            onClick={() => setCloseAfterSave(false)}
                            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && !closeAfterSave ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                            {loading && !closeAfterSave ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || isPushingJumia}
                            onClick={() => setCloseAfterSave(true)}
                            className="inline-flex items-center px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && closeAfterSave ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                            {loading && closeAfterSave ? 'Enregistrement...' : 'Enregistrer et Fermer'}
                        </button>
                    </div>
                </div>
            </form>

            <MediaLibraryModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                onSelect={(url) => {
                    setBookImage(url)
                    setIsMediaModalOpen(false)
                }}
            />
        </div>
    )
}
