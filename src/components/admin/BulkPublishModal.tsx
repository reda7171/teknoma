'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, CheckCircle, XCircle, Clock, Send, Loader2, FileText, Eye, ZoomIn, Link as LinkIcon, ShoppingBag, ExternalLink } from 'lucide-react'
import { normalizeImage } from '@/lib/utils'
import BookCreativeModal from './BookCreativeModal'
import VideoStudioModal from './VideoStudioModal'
import CaptionPreviewModal from './CaptionPreviewModal'

interface Book {
    id: string
    title: string
    author: string
    price: number
    image: string
    category: string | null
    productType?: string
    description?: string | null
    sellerSku?: string | null
    isSyncedWithJumia?: boolean
    jumiaStock?: number | null
}

interface BulkPublishModalProps {
    books: Book[]
    isOpen: boolean
    onClose: () => void
}

type PublishStatus = 'pending' | 'running' | 'success' | 'error'
type TargetDomain = 'riwaya.store' | 'riwaya.ma' | 'jumia.ma'

interface BookStatus {
    bookId: string
    status: PublishStatus
    message?: string
}

export default function BulkPublishModal({ books, isOpen, onClose }: BulkPublishModalProps) {
    const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'threads' | 'pinterest' | 'both' | 'all'>('all')
    const [format, setFormat] = useState<'post' | 'story' | 'video' | 'short'>('post')
    const [defaultDomain, setDefaultDomain] = useState<TargetDomain>('riwaya.store')
    const [bookDomains, setBookDomains] = useState<Record<string, TargetDomain>>({})
    const [logoChoice, setLogoChoice] = useState<'riwaya' | 'jumia'>('riwaya')
    const [includeStoreLink, setIncludeStoreLink] = useState(true)
    const [includeJumiaLink, setIncludeJumiaLink] = useState(true)
    const [delaySeconds, setDelaySeconds] = useState(5)
    const [isRunning, setIsRunning] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [statuses, setStatuses] = useState<BookStatus[]>([])
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [previewBook, setPreviewBook] = useState<Book | null>(null)
    const pauseRef = useRef(false)
    const stopRef = useRef(false)
    const [customUploadBase64, setCustomUploadBase64] = useState<string | null>(null)
    const [captureBook, setCaptureBook] = useState<Book | null>(null)
    const captureResolveRef = useRef<((url: string) => void) | null>(null)
    // Step aperçu avant publication
    const [showPreviewStep, setShowPreviewStep] = useState(true)
    const [previewStepData, setPreviewStepData] = useState<{ book: Book; imageBase64: string } | null>(null)
    const previewStepResolveRef = useRef<((approved: boolean) => void) | null>(null)
    const [previewLang, setPreviewLang] = useState<'fr' | 'ar' | 'en'>('fr')

    const getBookDomain = (bookId: string): TargetDomain => {
        return bookDomains[bookId] || defaultDomain
    }

    const setBookDomain = (bookId: string, domain: TargetDomain) => {
        setBookDomains(prev => ({ ...prev, [bookId]: domain }))
    }

    const handleSetAllDomains = (domain: TargetDomain) => {
        setDefaultDomain(domain)
        const newDomains: Record<string, TargetDomain> = {}
        books.forEach(b => {
            newDomains[b.id] = domain
        })
        setBookDomains(newDomains)
    }

    const resetState = () => {
        setStatuses([])
        setCurrentIndex(-1)
        setIsRunning(false)
        setIsPaused(false)
        pauseRef.current = false
        stopRef.current = false
    }

    useEffect(() => {
        if (isOpen) {
            resetState()
            setCustomUploadBase64(null)
        }
    }, [isOpen])

    if (!isOpen) return null

    const updateStatus = (bookId: string, status: PublishStatus, message?: string) => {
        setStatuses(prev => {
            const exists = prev.find(s => s.bookId === bookId)
            if (exists) {
                return prev.map(s => s.bookId === bookId ? { ...s, status, message } : s)
            }
            return [...prev, { bookId, status, message }]
        })
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Helper de génération des descriptions avec liens produits intégrés
    const buildCaptionWithLinks = (
        book: Book,
        domain: TargetDomain,
        lang: 'fr' | 'ar' | 'en' = 'fr',
        withJumia: boolean = includeJumiaLink,
        withStore: boolean = includeStoreLink
    ) => {
        const rawDesc = book.description ? book.description.trim() : book.title
        const snippet = rawDesc.length > 200 ? rawDesc.slice(0, 200) + '...' : rawDesc
        const price = book.price
        const oldPrice = Math.round(price * 1.3)

        const storeLink = domain === 'jumia.ma' ? null : `https://${domain}/${lang}/books/${book.id}`
        const sku = book.sellerSku?.trim()
        const jumiaUrl = sku
            ? `https://www.jumia.ma/catalog/?q=${encodeURIComponent(book.title)}`
            : `https://www.jumia.ma/catalog/?q=${encodeURIComponent(book.title)}`
        const showJumia = domain === 'jumia.ma' || (withJumia && (logoChoice === 'jumia' || !!sku || domain === 'jumia.ma'))

        if (lang === 'ar') {
            let text = `${snippet}\n\n`
            if (storeLink && withStore) {
                text += `📖 رابط الطلب المباشر :\n${storeLink}\n\n`
            }
            if (showJumia) {
                text += `🛒 متوفر أيضاً على جوميا :\n${jumiaUrl}\n\n`
            }
            text += `💰 الثمن : ${price} درهم (عوض ${oldPrice} درهم)\n🚚 الدفع عند الاستلام + التوصيل متاح لكافة المدن المغربية!\n\n#رواية #كتب #المغرب #قراءة`
            return text
        }

        if (lang === 'en') {
            let text = `${snippet}\n\n`
            if (storeLink && withStore) {
                text += `📖 Order online on our store:\n${storeLink}\n\n`
            }
            if (showJumia) {
                text += `🛒 Available on Jumia:\n${jumiaUrl}\n\n`
            }
            text += `💰 Price: ${price} MAD (was ${oldPrice} MAD)\n🚚 Cash on delivery available everywhere in Morocco!\n\n#riwaya #books #reading #morocco`
            return text
        }

        // Default 'fr'
        let text = `${snippet}\n\n`
        if (storeLink && withStore) {
            text += `📖 Commander sur notre boutique :\n${storeLink}\n\n`
        }
        if (showJumia) {
            text += `🛒 Commander sur Jumia :\n${jumiaUrl}\n\n`
        }
        text += `💰 Prix : ${price} DH (au lieu de ${oldPrice} DH)\n🚚 Paiement à la livraison + Livraison rapide partout au Maroc !\n\n#riwaya #livre #lecture #maroc`
        return text
    }

    // Capture de l'image créative hors-écran
    const captureCreative = (book: Book): Promise<string> => {
        return new Promise((resolve) => {
            captureResolveRef.current = resolve
            setCaptureBook(book)
        })
    }

    const handleCaptureReady = (url: string) => {
        setCaptureBook(null)
        if (captureResolveRef.current) {
            captureResolveRef.current(url)
            captureResolveRef.current = null
        }
    }

    const handleStart = async () => {
        resetState()
        setIsRunning(true)
        stopRef.current = false
        pauseRef.current = false

        for (let i = 0; i < books.length; i++) {
            if (stopRef.current) break

            // Pause : attendre la reprise
            while (pauseRef.current) {
                await sleep(500)
            }

            const book = books[i]
            setCurrentIndex(i)
            updateStatus(book.id, 'running', 'Démarrage...')

            try {
                const isPack = book.productType === 'PACK' || book.category === 'PACK'
                const isExtra = book.productType === 'EXTRA'
                
                const payloadId = isPack ? { packId: book.id } : (isExtra ? { extraId: book.id } : { bookId: book.id })

                // Générer la créative en background avant de publier
                let finalImageBase64: string | undefined
                
                if (format === 'post' || format === 'story') {
                    if (customUploadBase64) {
                        updateStatus(book.id, 'running', '1 - Préparation de l\'image personnalisée...')
                        finalImageBase64 = customUploadBase64
                        await sleep(400)
                    } else {
                        updateStatus(book.id, 'running', '1 - Génération de "Post créatif"...')
                        const capturedData = await captureCreative(book)
                        if (capturedData && capturedData.startsWith('data:')) {
                            finalImageBase64 = capturedData
                        } else {
                            updateStatus(book.id, 'running', '⚠️ Échec génération image, utilisation cover par défaut...')
                            await sleep(1000)
                        }
                    }

                    // Step aperçu : montrer l'image avant de publier (si activé)
                    if (showPreviewStep) {
                        updateStatus(book.id, 'running', '⏸️ En attente de votre approbation...')
                        const approved = await new Promise<boolean>((resolve) => {
                            previewStepResolveRef.current = resolve
                            setPreviewStepData({ book, imageBase64: finalImageBase64 || book.image })
                        })
                        setPreviewStepData(null)
                        if (!approved) {
                            updateStatus(book.id, 'error', '🚫 Ignoré par l\'admin')
                            continue
                        }
                    }
                }

                updateStatus(book.id, 'running', '2 - Publication sur les réseaux...')
                
                let customImageUrl = undefined;
                if (finalImageBase64) {
                    try {
                        const arr = finalImageBase64.split(',')
                        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
                        const bstr = atob(arr[1])
                        let n = bstr.length
                        const u8arr = new Uint8Array(n)
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n)
                        }
                        const blob = new Blob([u8arr], { type: mime })
                        const file = new File([blob], `creative_bulk_${book.id}.png`, { type: mime })

                        const formData = new FormData()
                        formData.append('file', file)
                        const uploadRes = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        })
                        const uploadData = await uploadRes.json()
                        if (uploadData.success) {
                            customImageUrl = uploadData.url
                        }
                    } catch (e) {
                        console.error('Erreur upload custom image', e)
                    }
                }

                const bookDomain = getBookDomain(book.id)
                const customCaption = buildCaptionWithLinks(book, bookDomain, 'fr', includeJumiaLink, includeStoreLink)

                const res = await fetch('/api/n8n/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payloadId,
                        format,
                        platform,
                        domain: bookDomain,
                        logoVariant: logoChoice,
                        includeJumiaLink,
                        sellerSku: book.sellerSku,
                        customCaption,
                        useDescription: 'short',
                        scheduleAt: null,
                        ...(customImageUrl ? { customImageUrl } : {})
                    })
                })
                const data = await res.json()
                if (data.success) {
                    updateStatus(book.id, 'success', '✅ Publié avec succès')
                } else {
                    updateStatus(book.id, 'error', data.error || 'Erreur n8n')
                }
            } catch (err: any) {
                updateStatus(book.id, 'error', 'Erreur réseau')
            }

            // Délai entre chaque publication (sauf dernier)
            if (i < books.length - 1 && !stopRef.current) {
                updateStatus(book.id, 'success', '✅ Terminé. Attente...')
                await sleep(delaySeconds * 1000)
            }
        }

        setIsRunning(false)
        setCurrentIndex(-1)
    }

    const handlePause = () => {
        pauseRef.current = !pauseRef.current
        setIsPaused(pauseRef.current)
    }

    const handleStop = () => {
        stopRef.current = true
        pauseRef.current = false
        setIsPaused(false)
        setIsRunning(false)
        setCurrentIndex(-1)
    }

    // Résoudre le step aperçu
    const handlePreviewApprove = () => {
        if (previewStepResolveRef.current) {
            previewStepResolveRef.current(true)
            previewStepResolveRef.current = null
        }
    }

    const handlePreviewSkip = () => {
        if (previewStepResolveRef.current) {
            previewStepResolveRef.current(false)
            previewStepResolveRef.current = null
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setCustomUploadBase64(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const successCount = statuses.filter(s => s.status === 'success').length
    const errorCount = statuses.filter(s => s.status === 'error').length
    const isDone = !isRunning && statuses.length > 0

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white w-full max-w-6xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[94vh] sm:h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900">Publication en boucle</h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{books.length} livre(s) sélectionné(s)</p>
                    </div>
                    <button
                        onClick={() => { handleStop(); onClose() }}
                        className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
                {/* Config */}
                {!isRunning && statuses.length === 0 && (
                    <div className="px-4 sm:px-6 py-3.5 sm:py-5 space-y-3.5 sm:space-y-4 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-y-auto min-h-0">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">Plateforme</label>
                            <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                {(['all', 'both', 'facebook', 'instagram', 'tiktok', 'threads', 'pinterest'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPlatform(p)}
                                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide transition-all ${platform === p ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {p === 'all' ? 'Toutes' : p === 'both' ? 'FB + Insta' : p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">Format de publication</label>
                            <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                {(['post', 'story', 'video', 'short'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => {
                                            setFormat(f)
                                            if (f !== 'post' && f !== 'story') setCustomUploadBase64(null)
                                        }}
                                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide transition-all ${format === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {f === 'post' ? 'Post créatif' : f === 'story' ? 'Story créative' : f === 'video' ? 'Shorts / Vidéo' : 'Desc. courte'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Domaine principal */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Domaine par défaut</label>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">Modifiable par livre ci-dessous</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                {(['riwaya.store', 'riwaya.ma', 'jumia.ma'] as const).map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => handleSetAllDomains(d)}
                                        className={`py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-black tracking-wide border transition-all flex items-center justify-center gap-1.5 ${
                                            defaultDomain === d
                                                ? (d === 'riwaya.store' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : (d === 'riwaya.ma' ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20' : 'bg-[#F68B1E] text-white border-[#F68B1E] shadow-md shadow-orange-500/20'))
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${defaultDomain === d ? 'bg-white' : (d === 'riwaya.store' ? 'bg-blue-500' : (d === 'riwaya.ma' ? 'bg-teal-500' : 'bg-[#F68B1E]'))}`} />
                                        <span className="truncate">{d}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Logo visuel */}
                        <div>
                            <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">Logo du visuel</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['riwaya', 'jumia'] as const).map(l => (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLogoChoice(l)}
                                        className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wide border transition-all flex items-center justify-center gap-2 ${
                                            logoChoice === l
                                                ? (l === 'jumia' ? 'bg-[#F68B1E] text-white border-[#F68B1E] shadow-md shadow-orange-500/20' : 'bg-black text-white border-black shadow-md')
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${logoChoice === l ? 'bg-white' : (l === 'jumia' ? 'bg-[#F68B1E]' : 'bg-amber-400')}`} />
                                        {l === 'riwaya' ? 'Riwaya' : 'Jumia'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Liens produits dans la description */}
                        <div className="bg-blue-50/60 p-3 sm:p-4 rounded-xl border border-blue-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🔗</span> Liens produits dans la légende
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-gray-500">Ajout automatique des URL produits dans la description</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={includeStoreLink}
                                        onChange={e => setIncludeStoreLink(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-0"
                                    />
                                    <span>Lien boutique ({defaultDomain === 'jumia.ma' ? 'riwaya.store' : defaultDomain})</span>
                                </label>
                                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={includeJumiaLink}
                                        onChange={e => setIncludeJumiaLink(e.target.checked)}
                                        className="rounded text-orange-500 focus:ring-0"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="text-[#F68B1E] font-black">Lien Jumia</span> (SKU / Recherche)
                                    </span>
                                </label>
                            </div>
                        </div>
                        
                        {(format === 'post' || format === 'story') && (
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200">
                                <label className="block text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-widest mb-1 sm:mb-2">Image personnalisée (Optionnel)</label>
                                <p className="text-[11px] sm:text-xs text-gray-500 mb-2 sm:mb-3">Si vous avez téléchargé une image depuis "Créative Publicitaire", vous pouvez l'importer ici pour ne pas utiliser la génération automatique par défaut.</p>
                                
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-white px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                        Importer une image
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                    {customUploadBase64 && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-white">
                                                <img src={customUploadBase64} alt="Upload" className="w-full h-full object-cover" />
                                            </div>
                                            <button onClick={() => setCustomUploadBase64(null)} className="text-[10px] font-bold text-red-500 hover:underline">
                                                Retirer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Toggle aperçu avant publication */}
                        <div className="flex items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200">
                            <div>
                                <p className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-widest">Aperçu avant publication</p>
                                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Valider chaque image & texte avant d'envoyer</p>
                            </div>
                            <button
                                onClick={() => setShowPreviewStep(p => !p)}
                                className={`relative w-11 sm:w-12 h-6 rounded-full transition-colors ${showPreviewStep ? 'bg-black' : 'bg-gray-200'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${showPreviewStep ? 'left-6 sm:left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2">
                                Délai entre publications : <span className="text-black">{delaySeconds}s</span>
                            </label>
                            <input
                                type="range"
                                min={3}
                                max={60}
                                value={delaySeconds}
                                onChange={e => setDelaySeconds(Number(e.target.value))}
                                className="w-full accent-black"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                <span>3s</span><span>60s</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`min-h-0 flex flex-col ${isRunning || isDone ? 'lg:col-span-2' : ''}`}>
                {/* Progress bar */}
                {(isRunning || isDone) && (
                    <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Progression</span>
                            <span className="text-xs font-black text-gray-900">{statuses.length}/{books.length}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-black h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(statuses.length / books.length) * 100}%` }}
                            />
                        </div>
                        {isDone && (
                            <div className="flex gap-4 mt-3">
                                <span className="text-xs font-bold text-green-600">{successCount} réussis</span>
                                {errorCount > 0 && <span className="text-xs font-bold text-red-500">{errorCount} erreurs</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Liste des livres responsive */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-3 sm:py-4 space-y-2.5">
                    {books.map((book, idx) => {
                        const status = statuses.find(s => s.bookId === book.id)
                        const isCurrent = currentIndex === idx

                        return (
                            <div
                                key={book.id}
                                className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all ${isCurrent ? 'bg-black/5 ring-2 ring-black/10' : 'bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Image */}
                                    {(() => {
                                        const imgSrc = normalizeImage(book.image) || '/book-placeholder.png'
                                        if (format === 'post' || format === 'story') {
                                            return (
                                                <div className={`w-9 ${format === 'story' ? 'h-14 sm:h-16' : 'h-11 sm:h-12'} bg-slate-900 rounded-lg flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden border border-slate-800`}>
                                                    <div className="absolute top-1 right-1 w-2 h-1 bg-white/20 rounded-sm" />
                                                    <img src={imgSrc} className="w-[60%] h-auto object-cover shadow-xl transform -translate-y-1" alt="" />
                                                </div>
                                            )
                                        }
                                        if (format === 'video') {
                                            return (
                                                <div className="w-9 h-14 sm:h-16 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                                    <img src={imgSrc} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" alt="" />
                                                    <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center z-10">
                                                        <Play className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" />
                                                    </div>
                                                </div>
                                            )
                                        }
                                        if (format === 'short') {
                                            return (
                                                <div className="w-9 h-11 sm:h-12 bg-gray-100 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border border-gray-200">
                                                    <FileText className="w-4 h-4 text-gray-400 mb-1" />
                                                    <div className="w-5 h-0.5 bg-gray-300 rounded mb-0.5" />
                                                    <div className="w-4 h-0.5 bg-gray-300 rounded" />
                                                </div>
                                            )
                                        }
                                        return (
                                            <img
                                                src={imgSrc}
                                                alt={book.title}
                                                className="w-9 h-11 sm:h-12 object-cover rounded-lg flex-shrink-0"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                            />
                                        )
                                    })()}

                                    {/* Info Titre / Auteur / SKU */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-gray-900 truncate" title={book.title}>{book.title}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[11px] text-gray-500 truncate max-w-[120px] sm:max-w-none">{book.author}</p>
                                            <span className="text-[11px] font-black text-gray-900">{book.price} DH</span>
                                            {book.sellerSku && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-800" title={`SKU: ${book.sellerSku}`}>
                                                    Jumia: {book.sellerSku}
                                                </span>
                                            )}
                                        </div>
                                        {status?.message && (
                                            <p className={`text-[10px] font-bold mt-1 leading-tight whitespace-normal ${status.status === 'error' ? 'text-red-500' : status.status === 'success' ? 'text-green-500' : 'text-amber-500'}`}>
                                                {status.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions & Statut */}
                                    <div className="flex-shrink-0 flex items-center gap-1.5">
                                        <button
                                            onClick={() => setPreviewBook(book)}
                                            className="p-1.5 text-gray-400 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                            title="Aperçu"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {isCurrent && (
                                            <Loader2 className="w-5 h-5 text-black animate-spin" />
                                        )}
                                        {status?.status === 'success' && (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        )}
                                        {status?.status === 'error' && (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        {!status && !isCurrent && (
                                            <Clock className="w-4 h-4 text-gray-300" />
                                        )}
                                    </div>
                                </div>

                                {/* Sélecteur de domaine par produit (adapté mobile) */}
                                <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[10px] text-gray-400 font-bold">Lien produit :</span>
                                    <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg border border-gray-200">
                                        {(['riwaya.store', 'riwaya.ma', 'jumia.ma'] as const).map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                disabled={isRunning}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setBookDomain(book.id, d)
                                                }}
                                                className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black transition-all ${
                                                    getBookDomain(book.id) === d
                                                        ? (d === 'riwaya.store' ? 'bg-blue-600 text-white shadow-xs' : (d === 'riwaya.ma' ? 'bg-teal-600 text-white shadow-xs' : 'bg-[#F68B1E] text-white shadow-xs'))
                                                        : 'text-gray-600 hover:text-black'
                                                }`}
                                                title={`Publier avec ${d}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                </div>
                </div>

                {/* Footer actions */}
                <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-t border-gray-100 flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {!isRunning && statuses.length === 0 && (
                        <button
                            onClick={handleStart}
                            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl shadow-black/10 active:scale-95"
                        >
                            <Play className="w-4 h-4" />
                            Lancer la publication
                        </button>
                    )}
                    {isRunning && (
                        <>
                            <button
                                onClick={handlePause}
                                className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all"
                            >
                                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                {isPaused ? 'Reprendre' : 'Pause'}
                            </button>
                            <button
                                onClick={handleStop}
                                className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
                            >
                                <X className="w-4 h-4" />
                                Arrêter
                            </button>
                        </>
                    )}
                    {isDone && (
                        <button
                            onClick={() => { resetState(); onClose() }}
                            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-900 transition-all"
                        >
                            <Send className="w-4 h-4" />
                            Terminé — Fermer
                        </button>
                    )}
                </div>
            </div>

            {/* Modals d'aperçu spécifiques */}
            {format === 'video' && (
                <VideoStudioModal
                    isOpen={!!previewBook}
                    onClose={() => setPreviewBook(null)}
                    book={previewBook}
                />
            )}
            {format === 'short' && (
                <CaptionPreviewModal
                    isOpen={!!previewBook}
                    onClose={() => setPreviewBook(null)}
                    book={previewBook}
                />
            )}
            {(format === 'post' || format === 'story') && (
                <BookCreativeModal
                    isOpen={!!previewBook}
                    onClose={() => setPreviewBook(null)}
                    book={previewBook}
                    format={format === 'story' ? 'story' : 'post'}
                />
            )}

            {/* Capture auto hors-écran pour la publication en boucle */}
            {captureBook && (format === 'post' || format === 'story') && (
                <BookCreativeModal
                    isOpen={true}
                    onClose={() => {}}
                    book={captureBook as any}
                    format={format === 'story' ? 'story' : 'post'}
                    initialLogoVariant={logoChoice}
                    onAutoCapture={handleCaptureReady}
                />
            )}

            {/* Popup aperçu avant publication */}
            {previewStepData && (() => {
                const book = previewStepData.book
                const price = book.price
                const oldPrice = Math.round(price * 1.3)

                const platformLabels: Record<string, { label: string; color: string }> = {
                    facebook: { label: 'Facebook', color: 'bg-blue-600' },
                    instagram: { label: 'Instagram', color: 'bg-pink-500' },
                    tiktok: { label: 'TikTok', color: 'bg-black' },
                    threads: { label: 'Threads', color: 'bg-gray-800' },
                    pinterest: { label: 'Pinterest', color: 'bg-red-600' },
                }
                const activePlatforms: string[] = platform === 'all' || platform === 'both'
                    ? (platform === 'both' ? ['facebook', 'instagram'] : ['facebook', 'instagram', 'tiktok', 'threads', 'pinterest'])
                    : [platform]

                return (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
                        <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[95vh]">

                            {/* Header */}
                            <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h3 className="text-base font-black text-gray-900">Aperçu avant publication</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[240px] sm:max-w-[280px]">{book.title}</p>
                                </div>
                                <ZoomIn className="w-5 h-5 text-gray-400" />
                            </div>

                            {/* Scrollable content */}
                            <div className="overflow-y-auto flex-1">
                                {/* Image */}
                                <div className="px-4 sm:px-6 pt-3.5 sm:pt-5">
                                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg bg-gray-50 flex items-center justify-center">
                                        <img
                                            src={previewStepData.imageBase64}
                                            alt="Aperçu"
                                            onError={(e) => { e.currentTarget.src = '/book-placeholder.png'; }}
                                            className="w-full object-contain max-h-[35vh] sm:max-h-60"
                                        />
                                    </div>
                                </div>

                                {/* Caption Preview avec liens intégrés */}
                                <div className="px-4 sm:px-6 pt-3.5">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Domaine cible</p>
                                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-1">
                                            {(['riwaya.store', 'riwaya.ma', 'jumia.ma'] as const).map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setBookDomain(book.id, d)}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black transition-all ${
                                                        getBookDomain(book.id) === d
                                                            ? (d === 'riwaya.store' ? 'bg-blue-600 text-white shadow-xs' : (d === 'riwaya.ma' ? 'bg-teal-600 text-white shadow-xs' : 'bg-[#F68B1E] text-white shadow-xs'))
                                                            : 'text-gray-500 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Légende & Liens intégrés</p>
                                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-1">
                                            {(['fr', 'ar', 'en'] as const).map(lang => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setPreviewLang(lang)}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-colors ${previewLang === lang ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-28 overflow-y-auto shadow-inner">
                                        <p className={`text-xs text-gray-700 whitespace-pre-wrap font-medium leading-relaxed ${previewLang === 'ar' ? 'text-right' : ''}`} dir={previewLang === 'ar' ? 'rtl' : 'ltr'}>
                                            {buildCaptionWithLinks(book, getBookDomain(book.id), previewLang, includeJumiaLink, includeStoreLink)}
                                        </p>
                                    </div>
                                </div>

                                {/* Infos : prix + plateformes */}
                                <div className="px-4 sm:px-6 py-3.5 space-y-3">
                                    {/* Prix */}
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2.5">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Prix affiché</p>
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="text-xl sm:text-2xl font-black text-gray-900">{price} <span className="text-sm sm:text-base">DH</span></span>
                                                <span className="text-xs sm:text-sm font-bold text-gray-400 line-through">{oldPrice} DH</span>
                                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    -{Math.round(100 - (price / oldPrice) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-2xl">📚</div>
                                    </div>

                                    {/* Plateformes cibles & Domaine */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Sera publié sur</p>
                                            <div className="flex flex-wrap gap-1">
                                                {activePlatforms.map(p => {
                                                    const meta = platformLabels[p]
                                                    if (!meta) return null
                                                    return (
                                                        <span key={p} className={`${meta.color} text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>
                                                            {meta.label}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right">Logo</p>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                    logoChoice === 'jumia' ? 'bg-orange-50 text-[#F68B1E] border border-orange-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                                                }`}>
                                                    {logoChoice === 'jumia' ? 'Jumia' : 'Riwaya'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right">Domaine</p>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                    getBookDomain(book.id) === 'riwaya.store' ? 'bg-blue-50 text-blue-700 border border-blue-200' : (getBookDomain(book.id) === 'riwaya.ma' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-orange-50 text-orange-700 border border-orange-200')
                                                }`}>
                                                    {getBookDomain(book.id)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-4 sm:px-6 py-3.5 sm:pb-5 flex gap-3 border-t border-gray-100 flex-shrink-0">
                                <button
                                    onClick={handlePreviewSkip}
                                    className="flex-1 py-2.5 sm:py-3 rounded-2xl border-2 border-gray-200 text-xs sm:text-sm font-black text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all uppercase tracking-widest"
                                >
                                    Ignorer
                                </button>
                                <button
                                    onClick={handlePreviewApprove}
                                    className="flex-1 py-2.5 sm:py-3 rounded-2xl bg-black text-white text-xs sm:text-sm font-black hover:bg-gray-900 transition-all uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95"
                                >
                                    Publier
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
