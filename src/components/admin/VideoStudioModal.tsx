'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Video, Plus, Trash2, MonitorPlay, Download, RotateCcw, Type, Palette, Music, Hash, Film, Loader } from 'lucide-react'
import * as htmlToImage from 'html-to-image'

interface VideoStudioModalProps {
    isOpen: boolean
    onClose: () => void
    book?: any
}

type DraggableKey = 'cover' | 'title' | 'author' | 'price' | 'whatsapp' | 'badge' | 'caption_overlay' | 'logo'

const DEFAULTS: Record<DraggableKey, { x: number; y: number }> = {
    cover: { x: 0, y: -40 },
    title: { x: 0, y: 0 },
    author: { x: 0, y: 0 },
    price: { x: 0, y: 0 },
    whatsapp: { x: 0, y: 0 },
    badge: { x: 0, y: 0 },
    caption_overlay: { x: 0, y: 0 },
    logo: { x: 0, y: 0 },
}

const THEMES = {
    dark:    { bg: 'from-gray-900 via-slate-800 to-black', text: 'text-white', accent: '#f59e0b', label: 'Sombre' },
    light:   { bg: 'from-stone-50 via-gray-100 to-stone-200', text: 'text-gray-900', accent: '#2563eb', label: 'Clair' },
    orange:  { bg: 'from-orange-500 via-red-500 to-rose-600', text: 'text-white', accent: '#fef08a', label: 'Orange' },
    emerald: { bg: 'from-teal-500 via-emerald-600 to-green-800', text: 'text-white', accent: '#86efac', label: 'Vert' },
    gold:    { bg: 'from-amber-300 via-yellow-400 to-orange-500', text: 'text-slate-900', accent: '#1e293b', label: 'Gold' },
    night:   { bg: 'from-indigo-900 via-blue-900 to-slate-900', text: 'text-white', accent: '#818cf8', label: 'Nuit' },
}

const FONTS = ['font-sans', 'font-serif', 'font-mono']
const FONT_LABELS = ['Sans', 'Serif', 'Mono']

export default function VideoStudioModal({ isOpen, onClose, book }: VideoStudioModalProps) {
    const previewRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState<DraggableKey | null>(null)
    const [editing, setEditing] = useState<DraggableKey | null>(null)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [positions, setPositions] = useState({ ...DEFAULTS })

    // Textes éditables
    const [title, setTitle] = useState('Titre du Livre')
    const [author, setAuthor] = useState('par Auteur')
    const [price, setPrice] = useState('0 MAD')
    const [oldPrice, setOldPrice] = useState('')
    const [whatsapp, setWhatsapp] = useState('+212 600 00 00 00')
    const [badge, setBadge] = useState('Nouveau')
    const [caption, setCaption] = useState('')
    const [hashtags, setHashtags] = useState('#riwaya #lecture #livre #maroc')
    const [musicLabel, setMusicLabel] = useState('Son original - Riwaya')

    // Images
    const [images, setImages] = useState<string[]>([])
    const [newImage, setNewImage] = useState('')
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    // Options visuelles
    const [theme, setTheme] = useState<keyof typeof THEMES>('dark')
    const [font, setFont] = useState(0)
    const [coverScale, setCoverScale] = useState(1.0)
    const [coverRotation, setCoverRotation] = useState(0)
    const [coverOpacity, setCoverOpacity] = useState(1)
    const [showBadge, setShowBadge] = useState(true)
    const [showPrice, setShowPrice] = useState(true)
    const [showOldPrice, setShowOldPrice] = useState(false)
    const [showWhatsapp, setShowWhatsapp] = useState(true)
    const [showLogo, setShowLogo] = useState(true)
    const [showCaptionOverlay, setShowCaptionOverlay] = useState(true)
    const [showShadow, setShowShadow] = useState(true)
    const [bgBlur, setBgBlur] = useState(20)
    const [bgOpacity, setBgOpacity] = useState(0.4)
    const [overlayOpacity, setOverlayOpacity] = useState(0)

    // Publication
    const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'facebook'>('tiktok')
    const [loading, setLoading] = useState(false)
    const [mp4Progress, setMp4Progress] = useState<number | null>(null)
    const [videoDuration, setVideoDuration] = useState(5)
    const [activeTab, setActiveTab] = useState<'design' | 'text' | 'publish'>('design')

    // Upload image locale
    const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const url = ev.target?.result as string
            if (url) { setImages(prev => [...prev, url]); setActiveImageIndex(prev => prev) }
        }
        reader.readAsDataURL(file)
        // reset pour permettre re-upload du même fichier
        e.target.value = ''
    }

    const activeImage = images[activeImageIndex] || '/book-placeholder.png'
    const currentTheme = THEMES[theme]

    useEffect(() => {
        if (isOpen && book) {
            setImages(book.image ? [book.image] : [])
            setTitle(book.title || 'Titre du Livre')
            setAuthor(`par ${book.author || 'Auteur'}`)
            setPrice(book.price ? `${book.price} MAD` : '0 MAD')
            setOldPrice(book.price ? `${Math.round(book.price * 1.3)} MAD` : '')
            setCaption(book.description || book.title || '')
            setPositions({ ...DEFAULTS })
            setCoverScale(1.0)
            setCoverRotation(0)

            fetch('/api/admin/settings').then(r => r.json()).then(d => {
                if (d.success && d.settings?.contact_phone) setWhatsapp(d.settings.contact_phone)
            }).catch(() => {})
        }
    }, [isOpen, book])

    // Drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, key: DraggableKey) => {
        if (editing === key) return
        e.preventDefault()
        setDragging(key)
        setOffset({ x: e.clientX - positions[key].x, y: e.clientY - positions[key].y })
    }, [editing, positions])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging) return
            setPositions(p => ({ ...p, [dragging]: { x: e.clientX - offset.x, y: e.clientY - offset.y } }))
        }
        const onUp = () => setDragging(null)
        if (dragging) {
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [dragging, offset])

    const resetPositions = () => setPositions({ ...DEFAULTS })

    const handleDownload = async () => {
        if (!previewRef.current) return
        try {
            const dataUrl = await htmlToImage.toPng(previewRef.current, { quality: 1, pixelRatio: 3, cacheBust: true })
            const a = document.createElement('a'); a.href = dataUrl; a.download = `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.png`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
        } catch (e) { console.error(e) }
    }

    const handleDownloadMp4 = async () => {
        if (!previewRef.current) return
        try {
            setMp4Progress(0)
            const { exportToMp4 } = await import('@/lib/videoExport')
            await exportToMp4({
                element: previewRef.current,
                duration: videoDuration,
                fps: 24,
                filename: `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`,
                onProgress: setMp4Progress,
            })
        } catch (e) {
            console.error('MP4 export error:', e)
            alert('Erreur lors de la génération vidéo. Vérifiez que votre navigateur supporte MediaRecorder.')
        } finally {
            setMp4Progress(null)
        }
    }

    const handleGenerate = async () => {
        setLoading(true)
        try {
            await fetch('/api/n8n/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, caption, images, is_short: true, texts: { title, author, price, whatsapp, hashtags } })
            })
            alert('Envoyé à n8n avec succès !')
            onClose()
        } catch { alert('Erreur lors de la génération') }
        finally { setLoading(false) }
    }

    if (!isOpen) return null

    // Helper: draggable wrapper
    const Draggable = ({ id, children, className = '' }: { id: DraggableKey; children: React.ReactNode; className?: string }) => (
        <div
            className={`absolute select-none cursor-move ${editing === id ? 'cursor-text' : 'cursor-move'} ${className}`}
            style={{ transform: `translate(${positions[id].x}px, ${positions[id].y}px)`, touchAction: 'none', zIndex: dragging === id ? 99 : 10 }}
            onMouseDown={e => handleMouseDown(e, id)}
            onDoubleClick={() => setEditing(id)}
            title="Déplacer / Double-clic pour éditer"
        >
            {children}
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
            <div className="bg-[#0f0f0f] w-full h-full flex overflow-hidden">

                {/* ============ LEFT: PHONE PREVIEW ============ */}
                <div className="flex-1 flex items-center justify-center bg-[#111] relative p-4">
                    {/* Theme swatches */}
                    <div className="absolute top-4 left-4 flex gap-2 z-20">
                        {Object.entries(THEMES).map(([key, t]) => (
                            <button key={key} onClick={() => setTheme(key as keyof typeof THEMES)}
                                className={`w-7 h-7 rounded-full border-2 transition-all bg-gradient-to-br ${t.bg} ${theme === key ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                title={t.label}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button onClick={resetPositions} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Réinitialiser positions">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={handleDownload} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Télécharger aperçu">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Phone frame */}
                    <div className="relative">
                        {/* Phone border */}
                        <div className="absolute inset-0 rounded-[44px] border-[10px] border-gray-800 shadow-[0_0_80px_rgba(0,0,0,0.8)] pointer-events-none z-50">
                            {/* notch */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-full" />
                        </div>

                        {/* Screen */}
                        <div
                            ref={previewRef}
                            className={`relative w-[320px] overflow-hidden bg-gradient-to-br ${currentTheme.bg} ${FONTS[font]} rounded-[36px]`}
                            style={{ height: '568px' }}
                        >
                            {/* Blurred bg */}
                            {activeImage && (
                                <div className="absolute inset-0 z-0"
                                    style={{
                                        backgroundImage: `url(${activeImage})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center',
                                        filter: `blur(${bgBlur}px) brightness(0.4)`,
                                        opacity: bgOpacity, transform: 'scale(1.1)'
                                    }}
                                />
                            )}

                            {/* Dark overlay */}
                            {overlayOpacity > 0 && (
                                <div className="absolute inset-0 z-0 bg-black" style={{ opacity: overlayOpacity }} />
                            )}

                            {/* Bottom gradient */}
                            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-1 pointer-events-none" />

                            {/* BADGE */}
                            {showBadge && (
                                <Draggable id="badge" className="top-6 left-6">
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                        <span
                                            contentEditable={editing === 'badge'}
                                            suppressContentEditableWarning
                                            onBlur={e => { setBadge(e.currentTarget.textContent || ''); setEditing(null) }}
                                            className={`text-[10px] font-black tracking-[0.2em] uppercase text-white outline-none ${editing === 'badge' ? 'ring-1 ring-white rounded' : ''}`}
                                        >{badge}</span>
                                    </div>
                                </Draggable>
                            )}

                            {/* LOGO */}
                            {showLogo && (
                                <Draggable id="logo" className="top-6 right-6">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/logo.png" alt="Logo" className="h-6 object-contain brightness-0 invert opacity-90" />
                                </Draggable>
                            )}

                            {/* BOOK COVER */}
                            <Draggable id="cover" className="top-1/2 left-1/2" style={{ transform: `translate(calc(-50% + ${positions.cover.x}px), calc(-50% + ${positions.cover.y}px))` } as any}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={activeImage}
                                    alt={title}
                                    className="rounded-lg object-cover transition-transform"
                                    style={{
                                        width: `${140 * coverScale}px`,
                                        transform: `rotate(${coverRotation}deg)`,
                                        opacity: coverOpacity,
                                        boxShadow: showShadow ? '0 30px 60px rgba(0,0,0,0.7)' : 'none'
                                    }}
                                />
                            </Draggable>

                            {/* TITLE */}
                            <Draggable id="title" className="bottom-[160px] left-0 right-0 text-center px-4">
                                <h2
                                    contentEditable={editing === 'title'}
                                    suppressContentEditableWarning
                                    onBlur={e => { setTitle(e.currentTarget.textContent || ''); setEditing(null) }}
                                    className={`text-2xl font-black leading-tight text-white drop-shadow-lg outline-none ${editing === 'title' ? 'ring-1 ring-white/60 rounded px-1' : ''}`}
                                >{title}</h2>
                            </Draggable>

                            {/* AUTHOR */}
                            <Draggable id="author" className="bottom-[138px] left-0 right-0 text-center px-4">
                                <p
                                    contentEditable={editing === 'author'}
                                    suppressContentEditableWarning
                                    onBlur={e => { setAuthor(e.currentTarget.textContent || ''); setEditing(null) }}
                                    className={`text-sm font-medium text-white/70 outline-none ${editing === 'author' ? 'ring-1 ring-white/60 rounded px-1' : ''}`}
                                >{author}</p>
                            </Draggable>

                            {/* PRICE */}
                            {showPrice && (
                                <Draggable id="price" className="bottom-[96px] left-0 right-0 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        {showOldPrice && (
                                            <span
                                                contentEditable={editing === 'price'}
                                                suppressContentEditableWarning
                                                onBlur={e => { setOldPrice(e.currentTarget.textContent || ''); setEditing(null) }}
                                                className="text-red-400 font-bold text-lg line-through opacity-80 outline-none"
                                            >{oldPrice}</span>
                                        )}
                                        <span
                                            contentEditable={editing === 'price'}
                                            suppressContentEditableWarning
                                            onBlur={e => { setPrice(e.currentTarget.textContent || ''); setEditing(null) }}
                                            className={`text-3xl font-black drop-shadow-lg outline-none ${editing === 'price' ? 'ring-1 ring-white/60 rounded px-1' : ''}`}
                                            style={{ color: currentTheme.accent }}
                                        >{price}</span>
                                    </div>
                                </Draggable>
                            )}

                            {/* WHATSAPP */}
                            {showWhatsapp && (
                                <Draggable id="whatsapp" className="bottom-[46px] left-0 right-0 flex justify-center">
                                    <div className="flex items-center gap-2 bg-[#25D366] text-white rounded-full px-5 py-2 shadow-lg">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        <span
                                            contentEditable={editing === 'whatsapp'}
                                            suppressContentEditableWarning
                                            onBlur={e => { setWhatsapp(e.currentTarget.textContent || ''); setEditing(null) }}
                                            className="text-sm font-bold outline-none"
                                        >{whatsapp}</span>
                                    </div>
                                </Draggable>
                            )}

                            {/* TikTok UI Overlay */}
                            <div className="absolute right-3 bottom-32 flex flex-col gap-4 z-20 pointer-events-none">
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm text-base">♡</div>
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm text-base">💬</div>
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm text-base">↪</div>
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm text-base">⋯</div>
                            </div>

                            {/* Caption overlay bottom */}
                            {showCaptionOverlay && (
                                <Draggable id="caption_overlay" className="left-3 bottom-16 w-48">
                                    <p className="text-white/80 text-[10px] line-clamp-2 leading-relaxed">{caption}</p>
                                    <div className="flex items-center gap-1 mt-1 text-white/60">
                                        <Music className="w-3 h-3" />
                                        <span className="text-[9px]">{musicLabel}</span>
                                    </div>
                                </Draggable>
                            )}
                        </div>
                    </div>

                    {/* Image selector strip */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {images.map((img, i) => (
                                <button key={i} onClick={() => setActiveImageIndex(i)}
                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-white scale-110' : 'border-white/30 opacity-60'}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ============ RIGHT: OPTIONS PANEL ============ */}
                <div className="w-[420px] bg-[#1a1a1a] flex flex-col h-full border-l border-white/10">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600 p-2 rounded-lg">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg leading-none">Studio Shorts</h2>
                                <p className="text-white/40 text-xs mt-0.5">Double-clic sur texte pour éditer</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-white/60 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        {[
                            { key: 'design', label: 'Design', icon: Palette },
                            { key: 'text', label: 'Textes', icon: Type },
                            { key: 'publish', label: 'Publier', icon: Send },
                        ].map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setActiveTab(key as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${activeTab === key ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10' : 'text-white/40 hover:text-white/70'}`}
                            >
                                <Icon className="w-4 h-4" /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">

                        {/* ===== DESIGN TAB ===== */}
                        {activeTab === 'design' && (<>
                            {/* Thème */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Thème</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(THEMES).map(([key, t]) => (
                                        <button key={key} onClick={() => setTheme(key as keyof typeof THEMES)}
                                            className={`h-14 rounded-xl bg-gradient-to-br ${t.bg} flex items-end p-2 transition-all ${theme === key ? 'ring-2 ring-purple-400 scale-105' : 'opacity-60 hover:opacity-90'}`}
                                        >
                                            <span className="text-[10px] font-bold text-white/90 drop-shadow">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Police */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Police</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {FONTS.map((f, i) => (
                                        <button key={i} onClick={() => setFont(i)}
                                            className={`py-2 rounded-xl border text-sm transition-all ${font === i ? 'border-purple-400 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/50 hover:border-white/30'} ${f}`}
                                        >{FONT_LABELS[i]}</button>
                                    ))}
                                </div>
                            </section>

                            {/* Images */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Images sources</h3>
                                {/* Input masqué pour upload fichier */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUploadImage}
                                />
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-purple-500 text-white/60 hover:text-white text-xs rounded-lg transition flex-shrink-0"
                                        title="Uploader une image depuis votre ordinateur"
                                    >
                                        <MonitorPlay className="w-4 h-4" />
                                        Upload
                                    </button>
                                    <input
                                        type="text" value={newImage} onChange={e => setNewImage(e.target.value)}
                                        placeholder="ou coller une URL…"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:border-purple-500 outline-none"
                                        onKeyDown={e => e.key === 'Enter' && newImage.trim() && (setImages([...images, newImage.trim()]), setNewImage(''))}
                                    />
                                    <button onClick={() => { if (newImage.trim()) { setImages([...images, newImage.trim()]); setNewImage('') } }}
                                        className="px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {images.map((img, i) => (
                                        <div key={i} className={`relative w-20 h-20 rounded-xl overflow-hidden group border-2 ${i === activeImageIndex ? 'border-purple-500' : 'border-white/10'}`}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img} alt="" className="w-full h-full object-cover" onClick={() => setActiveImageIndex(i)} />
                                            {i === 0 && <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Cover</span>}
                                            <button onClick={() => { setImages(images.filter((_, j) => j !== i)); if (activeImageIndex >= images.length - 1) setActiveImageIndex(0) }}
                                                className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Couverture */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Couverture</h3>
                                <div className="space-y-3">
                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Taille <span className="text-purple-400">{Math.round(coverScale * 100)}%</span></span>
                                    </label>
                                    <input type="range" min="0.4" max="2.5" step="0.05" value={coverScale} onChange={e => setCoverScale(Number(e.target.value))}
                                        className="w-full accent-purple-500" />

                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Rotation <span className="text-purple-400">{coverRotation}°</span></span>
                                    </label>
                                    <input type="range" min="-45" max="45" step="1" value={coverRotation} onChange={e => setCoverRotation(Number(e.target.value))}
                                        className="w-full accent-purple-500" />

                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Opacité couverture <span className="text-purple-400">{Math.round(coverOpacity * 100)}%</span></span>
                                    </label>
                                    <input type="range" min="0.1" max="1" step="0.05" value={coverOpacity} onChange={e => setCoverOpacity(Number(e.target.value))}
                                        className="w-full accent-purple-500" />
                                </div>
                            </section>

                            {/* Arrière-plan */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Arrière-plan</h3>
                                <div className="space-y-3">
                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Flou BG <span className="text-purple-400">{bgBlur}px</span></span>
                                    </label>
                                    <input type="range" min="0" max="40" step="1" value={bgBlur} onChange={e => setBgBlur(Number(e.target.value))}
                                        className="w-full accent-purple-500" />

                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Opacité BG <span className="text-purple-400">{Math.round(bgOpacity * 100)}%</span></span>
                                    </label>
                                    <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={e => setBgOpacity(Number(e.target.value))}
                                        className="w-full accent-purple-500" />

                                    <label className="flex justify-between text-xs text-white/60">
                                        <span>Overlay sombre <span className="text-purple-400">{Math.round(overlayOpacity * 100)}%</span></span>
                                    </label>
                                    <input type="range" min="0" max="0.9" step="0.05" value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))}
                                        className="w-full accent-purple-500" />
                                </div>
                            </section>

                            {/* Éléments affichés */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Éléments affichés</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Badge', value: showBadge, set: setShowBadge },
                                        { label: 'Logo', value: showLogo, set: setShowLogo },
                                        { label: 'Prix', value: showPrice, set: setShowPrice },
                                        { label: 'Ancien prix', value: showOldPrice, set: setShowOldPrice },
                                        { label: 'WhatsApp', value: showWhatsapp, set: setShowWhatsapp },
                                        { label: 'Caption', value: showCaptionOverlay, set: setShowCaptionOverlay },
                                        { label: 'Ombre couv.', value: showShadow, set: setShowShadow },
                                    ].map(({ label, value, set }) => (
                                        <button key={label} onClick={() => set(!value)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${value ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                                            <span>{label}</span>
                                            <span className={`w-4 h-4 rounded-full border-2 ${value ? 'bg-purple-500 border-purple-400' : 'border-white/30'}`} />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </>)}

                        {/* ===== TEXTES TAB ===== */}
                        {activeTab === 'text' && (<>
                            {[
                                { label: 'Titre', value: title, set: setTitle },
                                { label: 'Auteur', value: author, set: setAuthor },
                                { label: 'Prix affiché', value: price, set: setPrice },
                                { label: 'Ancien prix (barré)', value: oldPrice, set: setOldPrice },
                                { label: 'Numéro WhatsApp', value: whatsapp, set: setWhatsapp },
                                { label: 'Badge', value: badge, set: setBadge },
                                { label: 'Musique', value: musicLabel, set: setMusicLabel },
                            ].map(({ label, value, set }) => (
                                <div key={label}>
                                    <label className="text-xs font-semibold text-white/50 mb-1 block">{label}</label>
                                    <input type="text" value={value} onChange={e => set(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500 outline-none transition" />
                                </div>
                            ))}

                            <div>
                                <label className="text-xs font-semibold text-white/50 mb-1 block">Légende (Caption)</label>
                                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500 outline-none transition resize-none" />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-white/50 mb-1 flex items-center gap-2"><Hash className="w-3 h-3" />Hashtags</label>
                                <textarea value={hashtags} onChange={e => setHashtags(e.target.value)} rows={3}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-xs focus:border-purple-500 outline-none transition resize-none" />
                            </div>
                        </>)}

                        {/* ===== PUBLISH TAB ===== */}
                        {activeTab === 'publish' && (<>
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Plateforme</h3>
                                <div className="space-y-2">
                                    {[
                                        { key: 'tiktok', label: 'TikTok', color: 'border-white bg-white text-black', emoji: '🎵' },
                                        { key: 'instagram', label: 'Instagram Reels', color: 'border-pink-500 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white', emoji: '📸' },
                                        { key: 'facebook', label: 'Facebook Reels', color: 'border-blue-500 bg-blue-600 text-white', emoji: '👍' },
                                    ].map(({ key, label, color, emoji }) => (
                                        <button key={key} onClick={() => setPlatform(key as any)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${platform === key ? color : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                                            <span className="text-xl">{emoji}</span>
                                            <span className="font-bold text-sm">{label}</span>
                                            {platform === key && <span className="ml-auto text-xs font-bold bg-black/20 px-2 py-0.5 rounded-full">Sélectionné</span>}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Aperçu Caption</h3>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-6">{caption}</p>
                                    <p className="text-purple-400 text-xs mt-2">{hashtags}</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Images ({images.length})</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {images.map((img, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/20" />
                                    ))}
                                    {images.length === 0 && <p className="text-white/30 text-sm">Aucune image ajoutée</p>}
                                </div>
                            </section>
                        </>)}
                    </div>

                    {/* Footer actions */}
                    <div className="p-4 border-t border-white/10 bg-[#111] flex flex-col gap-3">
                        {/* MP4 progress bar */}
                        {mp4Progress !== null && (
                            <div className="w-full">
                                <div className="flex justify-between text-xs text-white/50 mb-1">
                                    <span>Génération vidéo… {mp4Progress}%</span>
                                    {mp4Progress < 25 && <span className="text-yellow-400">Capture en cours</span>}
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 transition-all duration-300 rounded-full" style={{ width: `${mp4Progress}%` }} />
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition" title="Télécharger PNG">
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDownloadMp4}
                                disabled={mp4Progress !== null || images.length === 0}
                                className="flex items-center gap-2 px-3 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold rounded-xl transition"
                                title={`Exporter en MP4 (${videoDuration}s)`}
                            >
                                {mp4Progress !== null ? <Loader className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                                <span className="text-sm">MP4</span>
                            </button>
                            <select
                                value={videoDuration}
                                onChange={e => setVideoDuration(Number(e.target.value))}
                                className="px-2 py-2.5 bg-white/5 border border-white/10 text-white text-sm rounded-xl outline-none"
                            >
                                {[3,5,7,10,15,30].map(d => <option key={d} value={d}>{d}s</option>)}
                            </select>
                            <button onClick={onClose} className="px-3 py-2.5 text-white/60 hover:text-white font-semibold rounded-xl transition hover:bg-white/5">
                                Annuler
                            </button>
                            <button onClick={handleGenerate} disabled={loading || images.length === 0}
                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/40">
                                <Send className="w-4 h-4" />
                                {loading ? 'Envoi…' : 'Publier'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
