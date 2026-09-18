'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, ImageIcon, Wand2, Languages, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { updatePack, type PackInput } from '@/lib/actions/packs'
import { publishPacksToJumia, checkJumiaLinkBySkuExact } from '@/lib/actions/jumia'
import PackCreativeModal from '@/components/admin/PackCreativeModal'
import ImageInput from '@/components/admin/ImageInput'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import CatalogImageModal from '@/components/admin/CatalogImageModal'

interface Book {
    id: string
    title: string
    author: string
    price: number
    image?: string
    category?: string | null
    active: boolean
    stock: number
}

interface PackEditFormProps {
    pack: {
        id: string
        name: string
        nameFr?: string
        nameEn?: string
        description: string
        descriptionFr?: string
        descriptionEn?: string
        price: number
        originalPrice?: number | null
        image: string
        isFreeDelivery: boolean
        shippingFees: number
        sellerSku?: string
        jumiaProductSid?: string
        selectedBookIds: string[]
        isAffiliate?: boolean
        affiliateLink?: string | null
    }
    books: Book[]
    whatsappPhone?: string
}

export default function PackEditForm({ pack, books, whatsappPhone }: PackEditFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isPushingJumia, setIsPushingJumia] = useState(false)
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [creativeFormat, setCreativeFormat] = useState<'post' | 'story' | null>(null)
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    const [mediaModalTab, setMediaModalTab] = useState<'marketing' | 'books'>('books')
    const [selectedBooks, setSelectedBooks] = useState<string[]>(pack.selectedBookIds)
    const [isFreeDelivery, setIsFreeDelivery] = useState(pack.isFreeDelivery)
    const [shippingFees, setShippingFees] = useState(pack.shippingFees || 30)
    const [isAffiliate, setIsAffiliate] = useState(pack.isAffiliate || false)
    const [affiliateLink, setAffiliateLink] = useState(pack.affiliateLink || '')
    const [searchQuery, setSearchQuery] = useState('')
    const [onlyAvailable, setOnlyAvailable] = useState(true)
    const [isCatalogOpen, setIsCatalogOpen] = useState(false)
    const [packImage, setPackImage] = useState(pack.image)
    const [isLinked, setIsLinked] = useState(false)

    useEffect(() => {
        if (pack.sellerSku) {
            checkJumiaLinkBySkuExact(pack.sellerSku, pack.jumiaProductSid).then(linked => {
                setIsLinked(linked)
            }).catch(err => {
                setIsLinked(false)
            })
        }
    }, [pack.sellerSku, pack.jumiaProductSid])

    // Champs multilingues
    const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>('ar')
    const [name, setName] = useState(pack.name)
    const [nameFr, setNameFr] = useState(pack.nameFr || '')
    const [nameEn, setNameEn] = useState(pack.nameEn || '')
    const [description, setDescription] = useState(pack.description)
    const [descriptionFr, setDescriptionFr] = useState(pack.descriptionFr || '')
    const [descriptionEn, setDescriptionEn] = useState(pack.descriptionEn || '')
    const [isTranslating, setIsTranslating] = useState(false)
    const [translateMsg, setTranslateMsg] = useState<string | null>(null)
    const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false)
    const [isGeneratingContent, setIsGeneratingContent] = useState(false)

    function toggleBook(bookId: string) {
        setSelectedBooks(prev =>
            prev.includes(bookId)
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId]
        )
    }

    function toggleAll() {
        if (selectedBooks.length === books.length) {
            setSelectedBooks([])
        } else {
            setSelectedBooks(books.map(b => b.id))
        }
    }

    function toggleAllInCategory(categoryBooks: Book[]) {
        const categoryBookIds = categoryBooks.map(b => b.id)
        const allSelected = categoryBookIds.every(id => selectedBooks.includes(id))
        if (allSelected) {
            setSelectedBooks(prev => prev.filter(id => !categoryBookIds.includes(id)))
        } else {
            setSelectedBooks(prev => Array.from(new Set([...prev, ...categoryBookIds])))
        }
    }

    // Traduction automatique AR → FR + EN via DeepL
    async function handleAutoTranslate() {
        setIsTranslating(true)
        setTranslateMsg(null)
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'book', title: name, description, sourceLang: 'AR' })
            })
            const data = await res.json()
            if (data.titleFr) setNameFr(data.titleFr)
            if (data.titleEn) setNameEn(data.titleEn)
            if (data.descriptionFr) setDescriptionFr(data.descriptionFr)
            if (data.descriptionEn) setDescriptionEn(data.descriptionEn)
            setTranslateMsg('Traduction terminée !')
        } catch {
            setTranslateMsg('Erreur lors de la traduction.')
        } finally {
            setIsTranslating(false)
        }
    }

    const generateDescription = () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) {
            alert('Veuillez d\'abord saisir un nom pour le pack.');
            return;
        }

        const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
        if (selectedBooksData.length === 0) {
            alert('Veuillez d\'abord sélectionner au moins un livre pour ce pack.');
            return;
        }

        const writtenByText = currentLang === 'ar' ? 'تأليف' : currentLang === 'en' ? 'written by' : 'écrit par';
        const booksListText = selectedBooksData.map(b => `- ${b.title} (${writtenByText} ${b.author})`).join('\n');
        
        let generatedText = '';
        if (currentLang === 'ar') {
            generatedText = `استفد من باقتنا الحصرية: "${packName}"!\n\nتحتوي هذه الباقة على الكتب التالية:\n${booksListText}\n\nاطلبها الآن بأفضل سعر!`;
            setDescription(generatedText);
        } else if (currentLang === 'fr') {
            generatedText = `Profitez de notre pack exclusif : "${packName}" !\n\nCe pack contient les livres suivants :\n${booksListText}\n\nCommandez dès maintenant au meilleur prix !`;
            setDescriptionFr(generatedText);
        } else {
            generatedText = `Enjoy our exclusive pack: "${packName}"!\n\nThis pack contains the following books:\n${booksListText}\n\nOrder now at the best price!`;
            setDescriptionEn(generatedText);
        }
    }

    const generateHighlightsAI = async () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) return alert('Veuillez saisir un nom pour le pack');
        
        const el = document.getElementById('jumiaHighlights') as HTMLTextAreaElement;
        let textToImprove = el?.value?.trim();
        
        if (!textToImprove) {
            const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
            const lis = selectedBooksData.map(b => `<li>${b.title}</li>`).join('');
            textToImprove = `<ul><li>Titre: ${packName}</li><li>Contient:</li>${lis}</ul>`;
            el.value = textToImprove;
            return; // If it was empty, we just set the default HTML. DeepL might break HTML tags.
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
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) return alert('Veuillez saisir un nom pour le pack');
        
        const el = document.getElementById('jumiaPackageContent') as HTMLInputElement;
        let textToImprove = el?.value?.trim();
        
        if (!textToImprove) {
            const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
            const booksTitles = selectedBooksData.map(b => b.title).join(', ');
            textToImprove = `1 x Pack de livres : ${packName} (${booksTitles})`;
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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (selectedBooks.length === 0) {
            setError('Veuillez sélectionner au moins un livre')
            setLoading(false)
            return
        }

        const formData = new FormData(e.currentTarget)

        const input: PackInput = {
            name,
            nameFr: nameFr || undefined,
            nameEn: nameEn || undefined,
            description: description || undefined,
            descriptionFr: descriptionFr || undefined,
            descriptionEn: descriptionEn || undefined,
            price: Math.round(parseFloat(formData.get('price') as string)),
            originalPrice: formData.get('originalPrice') ? Math.round(parseFloat(formData.get('originalPrice') as string)) : undefined,
            image: formData.get('image') as string || packImage || undefined,
            isFreeDelivery,
            shippingFees: isFreeDelivery ? 0 : shippingFees,
            bookIds: selectedBooks,
            isAffiliate,
            affiliateLink: affiliateLink || undefined,
            sellerSku: formData.get('sellerSku') as string || undefined,
            jumiaHighlights: formData.get('jumiaHighlights') as string || undefined,
            jumiaPackageContent: formData.get('jumiaPackageContent') as string || undefined,
        }

        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        const action = submitter?.value || 'close'

        const result = await updatePack(pack.id, input)

        if (result.success) {
            if (action === 'close') {
                router.push('/admin/packs')
                router.refresh()
            } else if (action === 'push_to_jumia') {
                setLoading(false)
                setIsPushingJumia(true)
                try {
                    const res = await publishPacksToJumia([pack.id])
                    if (res.success) {
                        alert(res.message || 'Pack enregistré et publié avec succès sur Jumia')
                    } else {
                        alert('Erreur Jumia: ' + res.message)
                    }
                } catch {
                    alert('Erreur technique lors de la publication')
                } finally {
                    setIsPushingJumia(false)
                    router.refresh()
                }
            } else {
                setLoading(false)
                alert('Pack enregistré avec succès !')
                router.refresh()
            }
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    async function handlePushToJumia() {
        if (!confirm('Voulez-vous vraiment publier ce pack sur Jumia ?')) return
        setIsPushingJumia(true)
        try {
            const res = await publishPacksToJumia([pack.id])
            if (res.success) {
                alert(res.message || 'Pack publié avec succès sur Jumia')
            } else {
                alert('Erreur: ' + res.message)
            }
        } catch {
            alert('Erreur technique lors de la publication')
        } finally {
            setIsPushingJumia(false)
        }
    }

    const selectedBooksData = books.filter(b => selectedBooks.includes(b.id))
    const totalOriginalPrice = Math.round(selectedBooksData.reduce((sum, b) => sum + b.price, 0))

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesAvailability = onlyAvailable ? (book.active && book.stock > 0) : true
        return matchesSearch && matchesAvailability
    })

    const groupedBooks = filteredBooks.reduce((acc, book) => {
        const category = book.category || 'Non catégorisé'
        if (!acc[category]) acc[category] = []
        acc[category].push(book)
        return acc
    }, {} as Record<string, typeof books>)

    // Onglets langue
    const langTabs = [
        { key: 'ar' as const, label: 'العربية', flag: '🇲🇦' },
        { key: 'fr' as const, label: 'Français', flag: '🇫🇷' },
        { key: 'en' as const, label: 'English', flag: '🇬🇧' },
    ]

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/packs" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Modifier le pack</h1>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                        <span className="text-sm font-medium text-gray-500">État du Pack :</span>
                        {selectedBooksData.length === 0 ? (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200">Vide</span>
                        ) : selectedBooksData.some(b => b.stock <= 0) ? (
                            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Incomplet ({selectedBooksData.filter(b => b.stock <= 0).length} livre(s) en rupture)
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Complet
                            </span>
                        )}
                    </div>
                    {pack.sellerSku && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${isLinked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {isLinked ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Lié à Jumia
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-4 h-4" />
                                    Non Linké
                                </>
                            )}
                        </div>
                    )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                    Modifiez les informations du pack &quot;{pack.name}&quot;
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-6">
                    {/* Pack Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Informations du Pack</h2>
                            {/* Onglets langue */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                {langTabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setCurrentLang(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentLang === tab.key ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <span>{tab.flag}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bouton traduction */}
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                type="button"
                                onClick={handleAutoTranslate}
                                disabled={isTranslating}
                                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                                {isTranslating ? 'Traduction...' : 'Traduire avec DeepL (AR → FR + EN)'}
                            </button>
                            {translateMsg && (
                                <span className={`text-xs px-2 py-1 rounded ${translateMsg.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                    {translateMsg}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Nom */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nom du pack {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                                </label>
                                {currentLang === 'ar' && (
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="اسم الحزمة"
                                        dir="rtl"
                                    />
                                )}
                                {currentLang === 'fr' && (
                                    <input
                                        type="text"
                                        value={nameFr}
                                        onChange={e => setNameFr(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nom du pack en français"
                                    />
                                )}
                                {currentLang === 'en' && (
                                    <input
                                        type="text"
                                        value={nameEn}
                                        onChange={e => setNameEn(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Pack name in English"
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateDescription}
                                        className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100"
                                    >
                                        ✨ Générer la description
                                    </button>
                                </div>
                                {currentLang === 'ar' && (
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="وصف الحزمة..."
                                        dir="rtl"
                                    />
                                )}
                                {currentLang === 'fr' && (
                                    <textarea
                                        rows={3}
                                        value={descriptionFr}
                                        onChange={e => setDescriptionFr(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Description du pack en français..."
                                    />
                                )}
                                {currentLang === 'en' && (
                                    <textarea
                                        rows={3}
                                        value={descriptionEn}
                                        onChange={e => setDescriptionEn(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Pack description in English..."
                                    />
                                )}
                            </div>

                            {/* Prix barré */}
                            <div>
                                <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prix de vente (درهم) <span className="text-gray-400 text-xs">(Optionnel, affiché barré)</span>
                                </label>
                                <input
                                    type="number"
                                    id="originalPrice"
                                    name="originalPrice"
                                    min="0"
                                    step="1"
                                    defaultValue={pack.originalPrice ? Math.round(pack.originalPrice) : ''}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="500"
                                />
                                {selectedBooks.length > 0 && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Prix total des livres sélectionnés: <span className="font-medium">{totalOriginalPrice} درهم</span>
                                    </p>
                                )}
                            </div>

                            {/* Prix promo */}
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prix de promotion (درهم) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    required
                                    min="0"
                                    step="1"
                                    defaultValue={Math.round(pack.price)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="450"
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
                                        defaultValue={pack.sellerSku || ''}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="SKU vendeur pour synchronisation"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('sellerSku') as HTMLInputElement
                                            if (input) input.value = `RIW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                                    >
                                        Générer
                                    </button>
                                </div>
                            </div>

                            {/* Image */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <label className="block text-sm font-medium text-gray-700">Image du pack</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setMediaModalTab('books'); setIsMediaModalOpen(true); }}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                                        >
                                            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                            depuis Médiathèque
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setMediaModalTab('marketing'); setIsMediaModalOpen(true); }}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                            depuis Créatives Marketing
                                        </button>
                                    </div>
                                </div>
                                <ImageInput defaultValue={packImage} bookTitle={pack.name} />
                            </div>

                            {/* Livraison */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isFreeDelivery"
                                            checked={isFreeDelivery}
                                            onChange={e => setIsFreeDelivery(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="isFreeDelivery" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Livraison gratuite
                                        </label>
                                    </div>
                                    {isFreeDelivery ? (
                                        <span className="text-2xl">🚚 <span className="text-xs font-black text-green-500">GRATUITE</span></span>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <label htmlFor="shippingFees" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                Frais de livraison
                                            </label>
                                            <select aria-label="Sélection shippingFees"
                                                id="shippingFees"
                                                value={shippingFees}
                                                onChange={e => setShippingFees(Number(e.target.value))}
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                            >
                                                {[20, 30, 35, 40, 45].map(fee => (
                                                    <option key={fee} value={fee}>{fee} درهم</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amazon Affiliate */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isAffiliate"
                                            checked={isAffiliate}
                                            onChange={e => setIsAffiliate(e.target.checked)}
                                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="isAffiliate" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
                                            Lien d'affiliation Amazon
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Affiliation</span>
                                        </label>
                                    </div>
                                    
                                    {isAffiliate && (
                                        <div className="pl-7 space-y-2">
                                            <label htmlFor="affiliateLink" className="block text-xs font-bold text-gray-600 uppercase">
                                                URL du produit Amazon (Associate Link)
                                            </label>
                                            <input
                                                type="url"
                                                id="affiliateLink"
                                                value={affiliateLink}
                                                onChange={e => setAffiliateLink(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                                placeholder="https://amzn.to/..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Jumia Highlights */}
                            <div className="mt-4">
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
                                    defaultValue={pack.jumiaHighlights || ''}
                                    placeholder={`<ul><li>Titre: ${pack.name}</li><li>Type: Pack de Livres</li></ul>`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Laisser vide pour utiliser la valeur par défaut. Recommandé : une liste HTML.
                                </p>
                            </div>

                            {/* Jumia Package Content */}
                            <div className="mt-4">
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
                                    defaultValue={pack.jumiaPackageContent || ''}
                                    placeholder={`1 x Pack de livres : ${pack.name}`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Exemple: "3 x Livres". Laisser vide pour la valeur par défaut.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sélection des livres */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Sélectionner les livres ({selectedBooks.length} sélectionné{selectedBooks.length > 1 ? 's' : ''})
                                </h2>
                                <div className="flex items-center gap-4 mt-1">
                                    <button type="button" onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        {selectedBooks.length === books.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer group ml-4">
                                        <div className="relative">
                                            <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="sr-only peer" />
                                            <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Disponible</span>
                                    </label>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div className="max-h-96 overflow-y-auto pr-2">
                            {Object.entries(groupedBooks).length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Aucun livre trouvé</p>
                            ) : (
                                Object.entries(groupedBooks).map(([category, categoryBooks]) => (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                {category} ({categoryBooks.length})
                                            </h3>
                                            <button type="button" onClick={() => toggleAllInCategory(categoryBooks)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                                {categoryBooks.every(b => selectedBooks.includes(b.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {categoryBooks.map(book => (
                                                <label
                                                    key={book.id}
                                                    className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedBooks.includes(book.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBooks.includes(book.id)}
                                                        onChange={() => toggleBook(book.id)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500"
                                                    />
                                                    <div className="ml-4 flex-1">
                                                        <p className="text-sm font-black text-gray-900 leading-tight">
                                                            {book.title}
                                                            {!book.active && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded">Inactif</span>}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                            {book.author}
                                                            <span className={`ml-3 ${book.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>Stock: {book.stock}</span>
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-black text-black ml-2">{Math.round(book.price)} درهم</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                        {packImage && (
                            <div className="mb-6 flex justify-center">
                                <img src={packImage} alt="Pack" className="w-full max-w-sm rounded-lg shadow-sm border border-gray-100 object-cover" />
                            </div>
                        )}
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h2>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Livres sélectionnés:</span>
                                <span className="font-medium">{selectedBooks.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Prix total livres:</span>
                                <span className="font-medium">{totalOriginalPrice} درهم</span>
                            </div>
                        </div>

                        {selectedBooksData.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm font-medium text-gray-700 mb-2">Livres inclus:</p>
                                <ul className="space-y-1">
                                    {selectedBooksData.map(book => (
                                        <li key={book.id} className="text-xs text-gray-600 flex justify-between border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                                            <span className="truncate pr-2">• {book.title}</span>
                                            <span className={`font-semibold whitespace-nowrap ${book.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Qté: {book.stock}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    value="save"
                                    disabled={loading || selectedBooks.length === 0 || isPushingJumia}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {loading ? '...' : 'Enregistrer'}
                                </button>
                                <button
                                    type="submit"
                                    value="close"
                                    disabled={loading || selectedBooks.length === 0 || isPushingJumia}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {loading ? '...' : 'Enregistrer et fermer'}
                                </button>
                                <button
                                type="submit"
                                value="push_to_jumia"
                                disabled={isPushingJumia || loading}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {isPushingJumia ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                Push to Jumia
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreativeFormat('post')}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                ✨ Générer Post (FB/Insta)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreativeFormat('story')}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                            >
                                ✨ Générer Story (FB/Insta)
                            </button>
                            <Link href="/admin/packs" className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                                Annuler
                            </Link>
                        </div>
                    </div>
                </div>
            </form>

            <PackCreativeModal
                isOpen={creativeFormat !== null}
                onClose={() => setCreativeFormat(null)}
                format={creativeFormat!}
                onImageGenerated={url => { setPackImage(url); setCreativeFormat(null) }}
                pack={{ id: pack.id, name, description, ...pack, books: selectedBooksData, whatsappNumber: whatsappPhone }}
            />

            <CatalogImageModal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                onSelect={url => { setPackImage(url); setIsCatalogOpen(false) }}
            />

            <MediaLibraryModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                initialTab={mediaModalTab}
                onSelect={(url) => {
                    setPackImage(url)
                    setIsMediaModalOpen(false)
                }}
            />
        </div>
    )
}
