'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, CheckCircle, XCircle, Clock, Send, Loader2, FileText, Eye } from 'lucide-react'
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
}

interface BulkPublishModalProps {
    books: Book[]
    isOpen: boolean
    onClose: () => void
}

type PublishStatus = 'pending' | 'running' | 'success' | 'error'

interface BookStatus {
    bookId: string
    status: PublishStatus
    message?: string
}

export default function BulkPublishModal({ books, isOpen, onClose }: BulkPublishModalProps) {
    const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'threads' | 'pinterest' | 'both' | 'all'>('all')
    const [format, setFormat] = useState<'post' | 'story' | 'video' | 'short'>('post')
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
                        await sleep(800) // Small visual delay
                    } else {
                        updateStatus(book.id, 'running', '1 - Génération de "Post créatif"...')
                        const capturedData = await captureCreative(book)
                        if (capturedData && capturedData.startsWith('data:')) {
                            finalImageBase64 = capturedData  // base64 → serveur le sauvegarde
                        } else {
                            updateStatus(book.id, 'running', '⚠️ Échec génération image, utilisation cover par défaut...')
                            await sleep(1000)
                        }
                    }
                }

                updateStatus(book.id, 'running', '2 - Publication sur les réseaux...')
                const res = await fetch('/api/n8n/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payloadId,
                        format,
                        platform,
                        useDescription: 'short',
                        scheduleAt: null,
                        ...(finalImageBase64 ? { customImageBase64: finalImageBase64 } : {})
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Publication en boucle</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{books.length} livre(s) sélectionnés</p>
                    </div>
                    <button
                        onClick={() => { handleStop(); onClose() }}
                        className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Config */}
                {!isRunning && statuses.length === 0 && (
                    <div className="px-8 py-6 space-y-5 border-b border-gray-100">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Plateforme</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(['all', 'both', 'facebook', 'instagram', 'tiktok', 'threads', 'pinterest'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPlatform(p)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${platform === p ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {p === 'all' ? 'Toutes' : p === 'both' ? 'FB + Insta' : p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Format de publication</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(['post', 'story', 'video', 'short'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => {
                                            setFormat(f)
                                            if (f !== 'post' && f !== 'story') setCustomUploadBase64(null)
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${format === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {f === 'post' ? 'Post créatif' : f === 'story' ? 'Story créative' : f === 'video' ? 'Shorts / Vidéo' : 'Desc. courte'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {(format === 'post' || format === 'story') && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Image personnalisée (Optionnel)</label>
                                <p className="text-xs text-gray-500 mb-3">Si vous avez téléchargé une image depuis "Créative Publicitaire", vous pouvez l'importer ici pour ne pas utiliser la génération automatique par défaut.</p>
                                
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
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

                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
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

                {/* Progress bar */}
                {(isRunning || isDone) && (
                    <div className="px-8 py-4 border-b border-gray-100">
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

                {/* Liste des livres */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-2">
                    {books.map((book, idx) => {
                        const status = statuses.find(s => s.bookId === book.id)
                        const isCurrent = currentIndex === idx

                        return (
                            <div
                                key={book.id}
                                className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isCurrent ? 'bg-black/5 ring-2 ring-black/10' : 'bg-gray-50'}`}
                            >
                                {/* Image */}
                                {/* Image */}
                                {(() => {
                                    const imgSrc = normalizeImage(book.image) || '/book-placeholder.png'
                                    if (format === 'post' || format === 'story') {
                                        return (
                                            <div className={`w-9 ${format === 'story' ? 'h-16' : 'h-12'} bg-slate-900 rounded-lg flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden border border-slate-800`}>
                                                <div className="absolute top-1 right-1 w-2 h-1 bg-white/20 rounded-sm" />
                                                <img src={imgSrc} className="w-[60%] h-auto object-cover shadow-xl transform -translate-y-1" />
                                            </div>
                                        )
                                    }
                                    if (format === 'video') {
                                        return (
                                            <div className="w-9 h-16 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                                <img src={imgSrc} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" />
                                                <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center z-10">
                                                    <Play className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" />
                                                </div>
                                            </div>
                                        )
                                    }
                                    if (format === 'short') {
                                        return (
                                            <div className="w-9 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border border-gray-200">
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
                                            className="w-9 h-12 object-cover rounded-lg flex-shrink-0"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                        />
                                    )
                                })()}
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{book.title}</p>
                                    <p className="text-xs text-gray-500 truncate">{book.author}</p>
                                    {status?.message && (
                                        <p className={`text-[10px] font-bold mt-1 leading-tight whitespace-normal ${status.status === 'error' ? 'text-red-500' : status.status === 'success' ? 'text-green-500' : 'text-amber-500'}`}>
                                            {status.message}
                                        </p>
                                    )}
                                </div>
                                {/* Statut & Actions */}
                                <div className="flex-shrink-0 flex items-center gap-2">
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
                        )
                    })}
                </div>

                {/* Footer actions */}
                <div className="px-8 py-5 border-t border-gray-100 flex items-center gap-3">
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
                                className="flex items-center justify-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all"
                            >
                                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                {isPaused ? 'Reprendre' : 'Pause'}
                            </button>
                            <button
                                onClick={handleStop}
                                className="flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
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

            {/* Aperçu Modal */}
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

            {/* Capture auto hors-\u00e9cran pour la publication en boucle */}
            {captureBook && (format === 'post' || format === 'story') && (
                <BookCreativeModal
                    isOpen={true}
                    onClose={() => {}}
                    book={captureBook as any}
                    format={format === 'story' ? 'story' : 'post'}
                    onAutoCapture={handleCaptureReady}
                />
            )}
        </div>
    )
}
