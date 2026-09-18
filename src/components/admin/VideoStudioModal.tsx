'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
    X, Download, RotateCcw, Film, Loader, ChevronLeft, ChevronRight,
    Image as ImageIcon, Type, Palette, Scissors, Smile, Music,
    Send, Trash2, Plus, MonitorPlay, ZoomIn, ZoomOut, Undo2, Redo2,
    AlignCenter, AlignLeft, AlignRight, Bold, Italic, Layers,
    SlidersHorizontal, Zap, Hash, Eye, EyeOff, Move, LayoutGrid, Sparkles
} from 'lucide-react'
import * as htmlToImage from 'html-to-image'

interface VideoStudioModalProps {
    isOpen: boolean
    onClose: () => void
    book?: any
}

type DraggableKey = 'cover' | 'title' | 'author' | 'price' | 'whatsapp' | 'badge' | 'caption_overlay' | 'logo' | 'socials'
type LeftPanel = 'images' | 'text' | 'themes' | 'effects' | 'montage' | 'stickers' | 'publish' | null

const DEFAULTS: Record<DraggableKey, { x: number; y: number }> = {
    cover: { x: 0, y: -40 },
    title: { x: 0, y: 0 },
    author: { x: 0, y: 0 },
    price: { x: 0, y: 0 },
    whatsapp: { x: 0, y: 0 },
    badge: { x: 0, y: 0 },
    caption_overlay: { x: 0, y: 0 },
    logo: { x: 0, y: 0 },
    socials: { x: 0, y: 0 },
}

const THEMES = {
    dark:    { bg: 'from-gray-900 via-slate-800 to-black', text: 'text-white', accent: '#f59e0b', label: 'Sombre' },
    light:   { bg: 'from-stone-50 via-gray-100 to-stone-200', text: 'text-gray-900', accent: '#2563eb', label: 'Clair' },
    orange:  { bg: 'from-orange-500 via-red-500 to-rose-600', text: 'text-white', accent: '#fef08a', label: 'Orange' },
    emerald: { bg: 'from-teal-500 via-emerald-600 to-green-800', text: 'text-white', accent: '#86efac', label: 'Vert' },
    gold:    { bg: 'from-amber-300 via-yellow-400 to-orange-500', text: 'text-slate-900', accent: '#1e293b', label: 'Gold' },
    night:   { bg: 'from-indigo-900 via-blue-900 to-slate-900', text: 'text-white', accent: '#818cf8', label: 'Nuit' },
    auto:    { bg: '', text: 'text-white', accent: '#ffffff', label: 'Auto ✨' },
}

const FONTS = ['font-sans', 'font-serif', 'font-mono']
const FONT_LABELS = ['Sans', 'Serif', 'Mono']

const COLOR_FILTERS = [
    { key: 'none', label: 'Original', style: {} },
    { key: 'warm', label: 'Chaud', style: { background: 'rgba(255,120,50,0.25)' } },
    { key: 'cold', label: 'Froid', style: { background: 'rgba(50,120,255,0.25)' } },
    { key: 'bw', label: 'N&B', style: { filter: 'grayscale(1)' } },
    { key: 'vintage', label: 'Vintage', style: { background: 'rgba(210,160,80,0.30)' } },
    { key: 'vivid', label: 'Vif', style: { background: 'rgba(255,0,180,0.15)' } },
]

const STICKER_SETS = ['🔥','⭐','📖','✨','💯','🚀','❤️','🎯','💎','🏆','🎁','👑','🌟','💫','🎨','📚','🖊️','🌙','☀️','🎵']

export default function VideoStudioModal({ isOpen, onClose, book }: VideoStudioModalProps) {
    const previewRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Drag
    const [dragging, setDragging] = useState<DraggableKey | null>(null)
    const [editing, setEditing] = useState<DraggableKey | null>(null)
    const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })
    const [positions, setPositions] = useState({ ...DEFAULTS })

    // Textes
    const [title, setTitle] = useState('Titre du Livre')
    const [author, setAuthor] = useState('par Auteur')
    const [price, setPrice] = useState('0 درهم')
    const [oldPrice, setOldPrice] = useState('')
    const [whatsapp, setWhatsapp] = useState('+212 600 00 00 00')
    const [badge, setBadge] = useState('Nouveau')
    const [caption, setCaption] = useState('')
    const [hashtags, setHashtags] = useState('#riwaya #lecture #livre #maroc')
    const [musicLabel, setMusicLabel] = useState('Son original - Riwaya')
    const [socialHandle, setSocialHandle] = useState('@riwaya.book')

    // Images
    const [images, setImages] = useState<string[]>([])
    const [newImage, setNewImage] = useState('')
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    // Visuel
    const [theme, setTheme] = useState<keyof typeof THEMES>('dark')
    const [font, setFont] = useState(0)
    const [coverScale, setCoverScale] = useState(1.0)
    const [coverRotation, setCoverRotation] = useState(0)
    const [coverOpacity, setCoverOpacity] = useState(1)
    const [showBadge, setShowBadge] = useState(true)
    const [showPrice, setShowPrice] = useState(true)
    const [showOldPrice, setShowOldPrice] = useState(false)
    const [showWhatsapp, setShowWhatsapp] = useState(true)
    const [showSocials, setShowSocials] = useState(true)
    const [showLogo, setShowLogo] = useState(true)
    const [showCaptionOverlay, setShowCaptionOverlay] = useState(false)
    const [showShadow, setShowShadow] = useState(true)
    const [bgBlur, setBgBlur] = useState(20)
    const [bgOpacity, setBgOpacity] = useState(0.4)
    const [overlayOpacity, setOverlayOpacity] = useState(0)
    const [customBg, setCustomBg] = useState<string>('')

    // Montage
    const [colorFilter, setColorFilter] = useState<string>('none')
    const [stickers, setStickers] = useState<{ emoji: string; x: number; y: number }[]>([])
    const [draggingSticker, setDraggingSticker] = useState<number | null>(null)
    const [stickerDragStart, setStickerDragStart] = useState({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })
    const [transition, setTransition] = useState<string>('fade')
    const [textAnimation, setTextAnimation] = useState<string>('fadeIn')
    const [textSpeed, setTextSpeed] = useState(1)
    const [videoDuration, setVideoDuration] = useState(5)
    const [zoom, setZoom] = useState(1)

    // Export / publish
    const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'facebook'>('tiktok')
    const [loading, setLoading] = useState(false)
    const [mp4Progress, setMp4Progress] = useState<number | null>(null)
    const [savingMarketing, setSavingMarketing] = useState<'png' | 'mp4' | null>(null)

    // UI State
    const [leftPanel, setLeftPanel] = useState<LeftPanel>('images')
    const [selectedElement, setSelectedElement] = useState<DraggableKey | null>(null)

    const activeImage = images[activeImageIndex] || '/book-placeholder.png'
    const currentTheme = THEMES[theme]

    useEffect(() => {
        if (isOpen && book) {
            setImages(book.image ? [book.image] : [])
            setTitle(book.title || 'Titre du Livre')
            setAuthor(`par ${book.author || 'Auteur'}`)
            setPrice(book.price ? `${book.price} درهم` : '0 درهم')
            setOldPrice(book.price ? `${Math.round(book.price * 1.3)} درهم` : '')
            setCaption(book.description || book.title || '')
            setPositions({ ...DEFAULTS })
            setCoverScale(1.0)
            setCoverRotation(0)
            fetch('/api/admin/settings').then(r => r.json()).then(d => {
                if (d.success && d.settings?.contact_phone) setWhatsapp(d.settings.contact_phone)
            }).catch(() => {})
        }
    }, [isOpen, book])

    // Auto color from image
    useEffect(() => {
        if (!activeImage || activeImage === '/book-placeholder.png') return
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 3; canvas.height = 3
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(img, 0, 0, 3, 3)
            const data = ctx.getImageData(0, 0, 3, 3).data
            const darken = (r: number, g: number, b: number) => `rgb(${Math.floor(r * 0.4)}, ${Math.floor(g * 0.4)}, ${Math.floor(b * 0.4)})`
            setCustomBg(`linear-gradient(135deg, ${darken(data[0],data[1],data[2])} 0%, ${darken(data[16],data[17],data[18])} 50%, ${darken(data[32],data[33],data[34])} 100%)`)
        }
        img.src = activeImage
    }, [activeImage])

    // Drag handlers — on stocke la position de départ (souris + position élément)
    const handleMouseDown = useCallback((e: React.MouseEvent, key: DraggableKey) => {
        if (editing === key) return
        e.preventDefault()
        e.stopPropagation()
        setDragging(key)
        setSelectedElement(key)
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: positions[key].x,
            posY: positions[key].y,
        })
    }, [editing, positions])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging) return
            // Divise le delta par le zoom pour compenser l'effet d'échelle
            const dx = (e.clientX - dragStart.mouseX) / zoom
            const dy = (e.clientY - dragStart.mouseY) / zoom
            setPositions(p => ({ ...p, [dragging]: { x: dragStart.posX + dx, y: dragStart.posY + dy } }))
        }
        const onUp = () => setDragging(null)
        if (dragging) {
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [dragging, dragStart, zoom])

    // Drag stickers
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (draggingSticker === null) return
            const dx = (e.clientX - stickerDragStart.mouseX) / zoom
            const dy = (e.clientY - stickerDragStart.mouseY) / zoom
            setStickers(prev => prev.map((s, i) =>
                i === draggingSticker ? { ...s, x: stickerDragStart.posX + dx, y: stickerDragStart.posY + dy } : s
            ))
        }
        const onUp = () => setDraggingSticker(null)
        if (draggingSticker !== null) {
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [draggingSticker, stickerDragStart, zoom])
    const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const url = ev.target?.result as string
            if (url) setImages(prev => [...prev, url])
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    // Helper to safely use htmlToImage without Next.js dev overlay popping up on harmless cssRules errors
    const safeHtmlToImage = async (node: HTMLElement, options: any) => {
        const originalError = console.error
        console.error = (...args) => {
            if (args[0] && typeof args[0] === 'string' && (args[0].includes('cssRules') || args[0].includes('Error inlining remote css file'))) return
            originalError(...args)
        }
        try {
            // Bypass the hard SecurityError crash in Chromium by skipping cssRules parsing
            return await htmlToImage.toPng(node, { ...options, fontEmbedCSS: '' })
        } finally {
            console.error = originalError
        }
    }

    // Download PNG
    const handleDownload = async () => {
        if (!previewRef.current) return
        try {
            const dataUrl = await safeHtmlToImage(previewRef.current, { quality: 1, pixelRatio: 3, cacheBust: false })
            const a = document.createElement('a'); a.href = dataUrl; a.download = `studio_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'design'}.png`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
        } catch (e) { console.error(e) }
    }

    // Export MP4
    const handleDownloadMp4 = async () => {
        if (!previewRef.current) return
        try {
            setMp4Progress(0)
            const dataUrls: string[] = []
            const originalIndex = activeImageIndex
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    setActiveImageIndex(i)
                    await new Promise(r => setTimeout(r, 800))
                    const dataUrl = await safeHtmlToImage(previewRef.current, { quality: 1, pixelRatio: 2, cacheBust: false, skipFonts: false })
                    dataUrls.push(dataUrl)
                    setMp4Progress(Math.round(((i + 1) / images.length) * 20))
                }
                setActiveImageIndex(originalIndex)
            }
            const { exportToMp4 } = await import('@/lib/videoExport')
            await exportToMp4({
                element: previewRef.current,
                imagesDataUrls: dataUrls.length > 0 ? dataUrls : undefined,
                duration: videoDuration * Math.max(images.length, 1),
                fps: 24,
                filename: `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`,
                onProgress: (pct) => setMp4Progress(dataUrls.length > 0 ? 20 + Math.round(pct * 0.8) : pct),
            })
        } catch (e) {
            console.error('MP4 export error:', e)
            alert('Erreur lors de la génération vidéo.')
        } finally { setMp4Progress(null) }
    }

    // Save to Marketing
    const handleSaveToMarketing = async (type: 'png' | 'mp4') => {
        if (!previewRef.current) return
        setSavingMarketing(type)
        try {
            let blob: Blob
            let filename: string
            if (type === 'png') {
                const dataUrl = await safeHtmlToImage(previewRef.current, { quality: 1, pixelRatio: 3, cacheBust: false })
                const byteString = atob(dataUrl.split(',')[1]);
                const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                blob = new Blob([ab], { type: mimeString });
                filename = `studio_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'design'}.png`
            } else {
                setMp4Progress(0)
                const dataUrls: string[] = []
                const originalIndex = activeImageIndex
                if (images.length > 0) {
                    for (let i = 0; i < images.length; i++) {
                        setActiveImageIndex(i)
                        await new Promise(r => setTimeout(r, 800))
                        const dataUrl = await safeHtmlToImage(previewRef.current, { quality: 1, pixelRatio: 2, cacheBust: false, skipFonts: false })
                        dataUrls.push(dataUrl)
                        setMp4Progress(Math.round(((i + 1) / images.length) * 20))
                    }
                    setActiveImageIndex(originalIndex)
                }
                const { exportToMp4 } = await import('@/lib/videoExport')
                blob = await exportToMp4({
                    element: previewRef.current,
                    imagesDataUrls: dataUrls.length > 0 ? dataUrls : undefined,
                    duration: videoDuration * Math.max(images.length, 1),
                    fps: 24,
                    filename: `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`,
                    onProgress: (pct) => setMp4Progress(dataUrls.length > 0 ? 20 + Math.round(pct * 0.8) : pct),
                    returnBlob: true
                }) as Blob
                filename = `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`
                setMp4Progress(null)
            }

            const formData = new FormData()
            const file = new File([blob], filename, { type: type === 'png' ? 'image/png' : 'video/mp4' })
            formData.append('file', file)
            formData.append('type', 'marketing')
            formData.append('marketingType', 'CREATIVE')
            if (book?.id) formData.append('bookId', book.id)

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const uploadData = await uploadRes.json()
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Erreur lors de la sauvegarde')

            alert(`Sauvegardé dans Marketing avec succès !`)
        } catch (e: any) {
            console.error('Save to Marketing error:', e)
            const errorMsg = e instanceof Error ? e.message : (e?.message || e?.name || (typeof e === 'string' ? e : 'Erreur inconnue (voir console)'))
            alert(`Erreur de sauvegarde: ${errorMsg}`)
        } finally {
            setSavingMarketing(null)
            setMp4Progress(null)
        }
    }

    // Publish
    const handleGenerate = async () => {
        if (!previewRef.current) return
        setLoading(true)
        try {
            setMp4Progress(0)
            const dataUrls: string[] = []
            const originalIndex = activeImageIndex
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    setActiveImageIndex(i)
                    await new Promise(r => setTimeout(r, 800))
                    const dataUrl = await safeHtmlToImage(previewRef.current, { quality: 1, pixelRatio: 2, cacheBust: false, skipFonts: false })
                    dataUrls.push(dataUrl)
                    setMp4Progress(Math.round(((i + 1) / images.length) * 20))
                }
                setActiveImageIndex(originalIndex)
            }
            
            const { exportToMp4 } = await import('@/lib/videoExport')
            const blob = await exportToMp4({
                element: previewRef.current,
                imagesDataUrls: dataUrls.length > 0 ? dataUrls : undefined,
                duration: videoDuration * Math.max(images.length, 1),
                fps: 24,
                filename: `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`,
                onProgress: (pct) => setMp4Progress(dataUrls.length > 0 ? 20 + Math.round(pct * 0.8) : pct),
                returnBlob: true
            }) as Blob

            const formData = new FormData()
            const file = new File([blob], `short_${book?.title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`, { type: 'video/mp4' })
            formData.append('file', file)
            formData.append('type', 'marketing')
            formData.append('marketingType', 'CREATIVE')
            if (book?.id) formData.append('bookId', book.id)

            setMp4Progress(null) // Finished rendering

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Erreur lors du téléversement de la vidéo')

            const res = await fetch('/api/n8n/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    platform, 
                    customCaption: `${caption}\n\n${hashtags}`, 
                    customImageUrl: uploadData.url,
                    bookId: book?.id,
                    is_short: true
                })
            })
            
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erreur lors de la publication')
            }
            
            alert('Envoyé avec succès !')
            onClose()
        } catch (e: any) { 
            console.error('Publish error:', e)
            alert(e.message || 'Erreur lors de la publication') 
        }
        finally { 
            setLoading(false)
            setMp4Progress(null)
        }
    }

    if (!isOpen) return null

    // Helper drag — appelé comme fonction (pas comme composant JSX) pour éviter le unmount/remount
    const el = (id: DraggableKey, className: string, children: React.ReactNode, extraStyle?: React.CSSProperties) => (
        <div
            key={id}
            className={`absolute select-none ${editing === id ? 'cursor-text' : 'cursor-move'} ${className} ${selectedElement === id ? 'outline outline-2 outline-blue-400 outline-offset-2 rounded' : ''}`}
            style={{
                transform: `translate(${positions[id].x}px, ${positions[id].y}px)`,
                touchAction: 'none',
                zIndex: dragging === id ? 99 : 10,
                ...extraStyle
            }}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDragging(id); setSelectedElement(id); setDragStart({ mouseX: e.clientX, mouseY: e.clientY, posX: positions[id].x, posY: positions[id].y }) }}
            onDoubleClick={e => { e.stopPropagation(); setEditing(id) }}
            onClick={e => { e.stopPropagation(); setSelectedElement(id) }}
        >
            {children}
        </div>
    )

    // Color filter overlay style
    const filterOverlayStyle = colorFilter !== 'none' ? COLOR_FILTERS.find(f => f.key === colorFilter)?.style || {} : {}

    // Left sidebar icons
    const sidebarTools = [
        { key: 'images', icon: ImageIcon, label: 'Images' },
        { key: 'themes', icon: Palette, label: 'Thèmes' },
        { key: 'text', icon: Type, label: 'Texte' },
        { key: 'effects', icon: SlidersHorizontal, label: 'Effets' },
        { key: 'montage', icon: Scissors, label: 'Montage' },
        { key: 'stickers', icon: Smile, label: 'Stickers' },
        { key: 'publish', icon: Send, label: 'Publier' },
    ] as const

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#1e1e2e] overflow-hidden">

            {/* ═══ TOP BAR ═══ */}
            <header className="h-12 bg-[#141420] border-b border-white/8 flex items-center justify-between px-4 shrink-0 z-50">
                {/* Left: title */}
                <div className="flex items-center gap-3">
                    <button aria-label="Action ChevronLeft" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-white/10" />
                    <span className="text-white font-semibold text-sm truncate max-w-[200px]">
                        {book?.title || 'Studio Shorts'}
                    </span>
                </div>

                {/* Center: undo/redo + zoom */}
                <div className="flex items-center gap-1">
                    <button onClick={() => setPositions({ ...DEFAULTS })} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition" title="Réinitialiser">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white/50 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Right: export buttons */}
                <div className="flex items-center gap-2">
                    {mp4Progress !== null && (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1">
                            <Loader className="w-3.5 h-3.5 animate-spin text-purple-400" />
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all" style={{ width: `${mp4Progress}%` }} />
                            </div>
                            <span className="text-xs text-white/50">{mp4Progress}%</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={() => handleSaveToMarketing('png')} disabled={savingMarketing !== null} className="flex items-center justify-center px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            {savingMarketing === 'png' ? 'Sauvegarde...' : 'Marketing (PNG)'}
                        </button>
                        <button onClick={() => handleSaveToMarketing('mp4')} disabled={savingMarketing !== null || images.length === 0} className="flex items-center justify-center px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                            <Film className="w-3.5 h-3.5 mr-1.5" />
                            {savingMarketing === 'mp4' ? 'Sauvegarde...' : 'Marketing (MP4)'}
                        </button>
                    </div>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition">
                        <Download className="w-3.5 h-3.5" /> PNG
                    </button>
                    <button
                        onClick={handleDownloadMp4}
                        disabled={mp4Progress !== null || images.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                    >
                        <Film className="w-3.5 h-3.5" />
                        {mp4Progress !== null && savingMarketing === null ? 'Export…' : 'Exporter MP4'}
                    </button>
                    <select aria-label="Champ de sélection" value={videoDuration} onChange={e => setVideoDuration(Number(e.target.value))}
                        className="px-2 py-1.5 bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg outline-none">
                        {[3,5,7,10,15,30].map(d => <option key={d} value={d}>{d}s</option>)}
                    </select>
                </div>
            </header>

            {/* ═══ MAIN AREA ═══ */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── ICON SIDEBAR ── */}
                <aside className="w-16 bg-[#141420] border-r border-white/8 flex flex-col items-center py-3 gap-1 shrink-0">
                    {sidebarTools.map(({ key, icon: Icon, label }) => (
                        <button key={key}
                            onClick={() => setLeftPanel(leftPanel === key ? null : key as LeftPanel)}
                            className={`flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-all text-center ${
                                leftPanel === key
                                    ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                            <span className="text-[9px] font-medium leading-none">{label}</span>
                        </button>
                    ))}
                </aside>

                {/* ── LEFT PANEL (contextual) ── */}
                {leftPanel && (
                    <div className="w-64 bg-[#1a1a2e] border-r border-white/8 flex flex-col shrink-0 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                            <span className="text-white font-semibold text-sm capitalize">
                                {sidebarTools.find(t => t.key === leftPanel)?.label}
                            </span>
                            <button onClick={() => setLeftPanel(null)} className="text-white/30 hover:text-white transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

                            {/* ── IMAGES ── */}
                            {leftPanel === 'images' && <>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/20 hover:border-purple-500 text-white/50 hover:text-purple-400 rounded-xl transition text-sm font-medium">
                                    <Plus className="w-4 h-4" /> Ajouter une image
                                </button>
                                <div className="flex gap-1 mb-2">
                                    <input type="text" value={newImage} onChange={e => setNewImage(e.target.value)}
                                        placeholder="Coller une URL…"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-white/30 focus:border-purple-500 outline-none"
                                        onKeyDown={e => e.key === 'Enter' && newImage.trim() && (setImages([...images, newImage.trim()]), setNewImage(''))} />
                                    <button onClick={() => { if (newImage.trim()) { setImages([...images, newImage.trim()]); setNewImage('') } }}
                                        className="px-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((img, i) => (
                                        <div key={i} className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${i === activeImageIndex ? 'border-purple-500 scale-105' : 'border-white/10'}`}
                                            onClick={() => setActiveImageIndex(i)}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            {i === 0 && <span className="absolute top-1 left-1 bg-purple-600 text-white text-[8px] px-1 rounded font-bold">Cover</span>}
                                            <button onClick={e => { e.stopPropagation(); setImages(images.filter((_, j) => j !== i)); if (activeImageIndex >= images.length - 1) setActiveImageIndex(0) }}
                                                className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                    {images.length === 0 && <p className="col-span-3 text-center text-white/30 text-xs py-4">Aucune image</p>}
                                </div>
                            </>}

                            {/* ── THEMES ── */}
                            {leftPanel === 'themes' && <>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(THEMES).map(([key, t]) => (
                                        <button key={key} onClick={() => setTheme(key as keyof typeof THEMES)}
                                            className={`h-16 rounded-xl flex items-end p-2 border-2 transition-all ${key !== 'auto' ? 'bg-gradient-to-br ' + t.bg : ''} ${theme === key ? 'border-purple-400 scale-105' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                                            style={key === 'auto' ? { background: customBg || '#333' } : {}}>
                                            <span className="text-[10px] font-bold text-white drop-shadow">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/50 font-semibold">Police</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {FONTS.map((f, i) => (
                                            <button key={i} onClick={() => setFont(i)}
                                                className={`py-2 rounded-lg border text-xs transition-all ${font === i ? 'border-purple-400 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/50'} ${f}`}>
                                                {FONT_LABELS[i]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <SliderRow label="Flou BG" value={bgBlur} min={0} max={40} unit="px" onChange={setBgBlur} color="purple" />
                                    <SliderRow label="Opacité BG" value={Math.round(bgOpacity * 100)} min={0} max={100} unit="%" onChange={v => setBgOpacity(v / 100)} color="purple" />
                                    <SliderRow label="Overlay sombre" value={Math.round(overlayOpacity * 100)} min={0} max={90} unit="%" onChange={v => setOverlayOpacity(v / 100)} color="purple" />
                                </div>
                            </>}

                            {/* ── TEXT ── */}
                            {leftPanel === 'text' && <>
                                <div className="space-y-1 text-xs text-white/50 font-semibold mb-1">Éléments visibles</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Badge', value: showBadge, set: setShowBadge },
                                        { label: 'Logo', value: showLogo, set: setShowLogo },
                                        { label: 'Prix', value: showPrice, set: setShowPrice },
                                        { label: 'Ancien prix', value: showOldPrice, set: setShowOldPrice },
                                        { label: 'WhatsApp', value: showWhatsapp, set: setShowWhatsapp },
                                        { label: 'Réseaux', value: showSocials, set: setShowSocials },
                                        { label: 'Caption', value: showCaptionOverlay, set: setShowCaptionOverlay },
                                        { label: 'Ombre', value: showShadow, set: setShowShadow },
                                    ].map(({ label, value, set }) => (
                                        <button key={label} onClick={() => set(!value)}
                                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs transition-all ${value ? 'border-purple-500 bg-purple-500/15 text-purple-300' : 'border-white/10 text-white/40'}`}>
                                            <span>{label}</span>
                                            {value ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-white/8 pt-4 space-y-3">
                                    {[
                                        { label: 'Titre', value: title, set: setTitle },
                                        { label: 'Auteur', value: author, set: setAuthor },
                                        { label: 'Prix', value: price, set: setPrice },
                                        { label: 'Ancien prix', value: oldPrice, set: setOldPrice },
                                        { label: 'WhatsApp', value: whatsapp, set: setWhatsapp },
                                        { label: 'Réseaux', value: socialHandle, set: setSocialHandle },
                                        { label: 'Badge', value: badge, set: setBadge },
                                        { label: 'Musique', value: musicLabel, set: setMusicLabel },
                                    ].map(({ label, value, set }) => (
                                        <div key={label}>
                                            <label className="text-[10px] text-white/40 mb-1 block">{label}</label>
                                            <input type="text" value={value} onChange={e => set(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:border-purple-500 outline-none transition" />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-[10px] text-white/40 mb-1 block">Caption</label>
                                        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:border-purple-500 outline-none transition resize-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Hashtags</label>
                                        <textarea value={hashtags} onChange={e => setHashtags(e.target.value)} rows={2}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-xs focus:border-purple-500 outline-none transition resize-none" />
                                    </div>
                                </div>
                            </>}

                            {/* ── EFFECTS ── */}
                            {leftPanel === 'effects' && <>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/50 font-semibold">Filtre couleur</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {COLOR_FILTERS.map(f => (
                                            <button key={f.key} onClick={() => setColorFilter(f.key)}
                                                className={`relative h-14 rounded-xl border-2 overflow-hidden transition-all ${colorFilter === f.key ? 'border-white scale-105' : 'border-white/10 opacity-60 hover:opacity-90'}`}>
                                                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-600" />
                                                {f.style.background && <div className="absolute inset-0 mix-blend-multiply" style={{ background: f.style.background as string }} />}
                                                {(f.style as any).filter && <div className="absolute inset-0" style={{ filter: (f.style as any).filter }} />}
                                                <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white drop-shadow">{f.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <SliderRow label="Taille couverture" value={Math.round(coverScale * 100)} min={40} max={250} unit="%" onChange={v => setCoverScale(v / 100)} color="blue" />
                                    <SliderRow label="Rotation" value={coverRotation} min={-45} max={45} unit="°" onChange={setCoverRotation} color="blue" />
                                    <SliderRow label="Opacité couv." value={Math.round(coverOpacity * 100)} min={10} max={100} unit="%" onChange={v => setCoverOpacity(v / 100)} color="blue" />
                                </div>
                            </>}

                            {/* ── MONTAGE ── */}
                            {leftPanel === 'montage' && <>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/50 font-semibold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Transition</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { key: 'none', label: 'Aucune' },
                                            { key: 'fade', label: 'Fondu' },
                                            { key: 'slide', label: 'Glissement' },
                                            { key: 'zoom', label: 'Zoom' },
                                        ].map(t => (
                                            <button key={t.key} onClick={() => setTransition(t.key)}
                                                className={`py-2 rounded-lg border text-xs font-medium transition-all ${transition === t.key ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/50 hover:border-white/20'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/50 font-semibold flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Animation texte</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { key: 'none', label: 'Statique' },
                                            { key: 'fadeIn', label: 'Apparition' },
                                            { key: 'slideUp', label: 'Remontée' },
                                            { key: 'typewriter', label: 'Machine' },
                                        ].map(a => (
                                            <button key={a.key} onClick={() => setTextAnimation(a.key)}
                                                className={`py-2 rounded-lg border text-xs font-medium transition-all ${textAnimation === a.key ? 'border-orange-500 bg-orange-500/20 text-orange-300' : 'border-white/10 text-white/50 hover:border-white/20'}`}>
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                    <SliderRow label="Vitesse animation" value={textSpeed * 10} min={5} max={30} unit="x" onChange={v => setTextSpeed(v / 10)} color="orange" />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 text-xs text-white/50">
                                    <div className="flex justify-between"><span>Slides</span><span className="text-white">{images.length}</span></div>
                                    <div className="flex justify-between"><span>Transition</span><span className="text-purple-300">{transition}</span></div>
                                    <div className="flex justify-between"><span>Animation</span><span className="text-orange-300">{textAnimation}</span></div>
                                    <div className="flex justify-between"><span>Durée totale</span><span className="text-white">{videoDuration * Math.max(images.length, 1)}s</span></div>
                                </div>
                            </>}

                            {/* Sticker panel */}
                            {leftPanel === 'stickers' && <>
                                <p className="text-xs text-white/40">Cliquer pour ajouter sur le canvas</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {STICKER_SETS.map(emoji => (
                                        <button key={emoji}
                                            onClick={() => setStickers(prev => [...prev, { emoji, x: 50 + Math.random() * 180, y: 80 + Math.random() * 300 }])}
                                            className="aspect-square rounded-xl text-xl flex items-center justify-center border-2 border-white/10 hover:border-yellow-400 hover:bg-yellow-400/10 transition-all">
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                {stickers.length > 0 && (
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-white/40">{stickers.length} sticker(s)</span>
                                        <button onClick={() => setStickers([])} className="text-xs text-red-400 hover:text-red-300">Tout effacer</button>
                                    </div>
                                )}
                                <div className="space-y-1 mt-2">
                                    {stickers.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                                            <span className="text-lg">{s.emoji}</span>
                                            <span className="text-xs text-white/40">x:{Math.round(s.x)} y:{Math.round(s.y)}</span>
                                            <button onClick={() => setStickers(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </>}

                            {/* ── PUBLISH ── */}
                            {leftPanel === 'publish' && <>
                                <div className="space-y-2">
                                    {[
                                        { key: 'tiktok', label: 'TikTok', emoji: '🎵', cls: 'bg-black text-white border-white' },
                                        { key: 'instagram', label: 'Instagram', emoji: '📸', cls: 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white border-pink-500' },
                                        { key: 'facebook', label: 'Facebook', emoji: '👍', cls: 'bg-blue-600 text-white border-blue-500' },
                                        { key: 'threads', label: 'Threads', emoji: '🧵', cls: 'bg-slate-900 text-white border-slate-700' },
                                        { key: 'pinterest', label: 'Pinterest', emoji: '📌', cls: 'bg-red-600 text-white border-red-500' },
                                        { key: 'all', label: 'Toutes', emoji: '🚀', cls: 'bg-indigo-600 text-white border-indigo-500' },
                                    ].map(({ key, label, emoji, cls }) => (
                                        <button key={key} onClick={() => setPlatform(key as any)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all ${platform === key ? cls : 'border-white/10 bg-white/5 text-white/50'}`}>
                                            <span>{emoji}</span> {label}
                                            {platform === key && <span className="ml-auto text-[10px] bg-black/20 px-2 py-0.5 rounded-full">Sélectionné</span>}
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                    <p className="text-white/60 text-xs whitespace-pre-wrap line-clamp-5">{caption}</p>
                                    <p className="text-purple-400 text-xs mt-2">{hashtags}</p>
                                </div>
                                <button onClick={handleGenerate} disabled={loading || images.length === 0}
                                    className="w-full flex justify-center items-center gap-2 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white font-bold rounded-xl transition">
                                    <Send className="w-4 h-4" />
                                    {loading ? (mp4Progress !== null ? `Génération ${mp4Progress}%...` : 'Envoi…') : 'Publier maintenant'}
                                </button>
                            </>}

                        </div>
                    </div>
                )}

                {/* ═══ CANVAS AREA ═══ */}
                <main className="flex-1 bg-[#13131f] flex flex-col items-center justify-center overflow-hidden relative"
                    onClick={() => { setSelectedElement(null); setEditing(null) }}>

                    {/* Checkered background */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)', backgroundSize: '20px 20px' }} />

                    {/* Phone preview */}
                    <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
                        {/* Phone border */}
                        <div className="absolute inset-0 rounded-[44px] border-[10px] border-[#1e1e2e] shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_40px_rgba(124,58,237,0.15)] pointer-events-none z-50">
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1e1e2e] rounded-full" />
                            {/* Side buttons */}
                            <div className="absolute -right-[14px] top-24 w-1.5 h-12 bg-[#2a2a3e] rounded-r-full" />
                            <div className="absolute -left-[14px] top-20 w-1.5 h-8 bg-[#2a2a3e] rounded-l-full" />
                            <div className="absolute -left-[14px] top-32 w-1.5 h-8 bg-[#2a2a3e] rounded-l-full" />
                        </div>

                        {/* Screen */}
                        <div
                            ref={previewRef}
                            onClick={e => e.stopPropagation()}
                            className={`relative w-[340px] overflow-hidden ${theme === 'auto' ? '' : 'bg-gradient-to-br ' + currentTheme.bg} ${FONTS[font]} rounded-[36px]`}
                            style={{ height: '600px', ...(theme === 'auto' ? { background: customBg } : {}) }}
                        >
                            {/* Blurred bg */}
                            {activeImage && (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={activeImage} alt="" crossOrigin="anonymous"
                                        className="absolute inset-0 w-full h-full object-cover z-0"
                                        style={{ filter: `blur(${bgBlur}px) brightness(0.4)`, opacity: bgOpacity, transform: 'scale(1.1)' }}
                                    />
                                </>
                            )}
                            {overlayOpacity > 0 && <div className="absolute inset-0 z-0 bg-black" style={{ opacity: overlayOpacity }} />}
                            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-1 pointer-events-none" />

                            {/* BADGE */}
                            {showBadge && el('badge', 'top-6 left-6',
                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                    <span contentEditable={editing === 'badge'} suppressContentEditableWarning
                                        onBlur={e => { setBadge(e.currentTarget.textContent || ''); setEditing(null) }}
                                        className="text-[10px] font-black tracking-[0.2em] uppercase text-white outline-none"
                                    >{badge}</span>
                                </div>
                            )}

                            {/* LOGO */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {showLogo && el('logo', 'top-6 right-6',
                                <img src="/logo.png" alt="Logo" crossOrigin="anonymous" className="h-6 object-contain brightness-0 invert opacity-90" />
                            )}

                            {/* BOOK COVER */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {el('cover', 'top-1/2 left-1/2',
                                <img src={activeImage} alt={title} crossOrigin="anonymous"
                                    className="rounded-xl object-cover"
                                    style={{ width: `${148 * coverScale}px`, transform: `rotate(${coverRotation}deg)`, opacity: coverOpacity, boxShadow: showShadow ? '0 40px 80px rgba(0,0,0,0.7)' : 'none' }}
                                />,
                                { transform: `translate(calc(-50% + ${positions.cover.x}px), calc(-50% + ${positions.cover.y}px))` }
                            )}

                            {/* TITLE */}
                            {el('title', 'bottom-[168px] left-0 right-0 text-center px-4',
                                <h2 contentEditable={editing === 'title'} suppressContentEditableWarning
                                    onBlur={e => { setTitle(e.currentTarget.textContent || ''); setEditing(null) }}
                                    className="text-2xl font-black leading-tight text-white drop-shadow-lg outline-none"
                                >{title}</h2>
                            )}

                            {/* AUTHOR */}
                            {el('author', 'bottom-[146px] left-0 right-0 text-center px-4',
                                <p contentEditable={editing === 'author'} suppressContentEditableWarning
                                    onBlur={e => { setAuthor(e.currentTarget.textContent || ''); setEditing(null) }}
                                    className="text-sm font-medium text-white/70 outline-none"
                                >{author}</p>
                            )}

                            {/* PRICE */}
                            {showPrice && el('price', 'bottom-[100px] left-0 right-0 text-center',
                                <div className="flex items-center justify-center gap-3">
                                    {showOldPrice && (
                                        <span contentEditable={editing === 'price'} suppressContentEditableWarning
                                            onBlur={e => { setOldPrice(e.currentTarget.textContent || ''); setEditing(null) }}
                                            className="text-red-400 font-bold text-lg line-through opacity-80 outline-none"
                                        >{oldPrice}</span>
                                    )}
                                    <span contentEditable={editing === 'price'} suppressContentEditableWarning
                                        onBlur={e => { setPrice(e.currentTarget.textContent || ''); setEditing(null) }}
                                        className="text-3xl font-black drop-shadow-lg outline-none"
                                        style={{ color: currentTheme.accent }}
                                    >{price}</span>
                                </div>
                            )}

                            {/* WHATSAPP */}
                            {showWhatsapp && el('whatsapp', 'bottom-[50px] left-0 right-0 flex justify-center',
                                <div className="flex items-center gap-2 bg-[#25D366] text-white rounded-full px-5 py-2 shadow-lg">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    <span contentEditable={editing === 'whatsapp'} suppressContentEditableWarning
                                        onBlur={e => { setWhatsapp(e.currentTarget.textContent || ''); setEditing(null) }}
                                        className="text-sm font-bold outline-none"
                                    >{whatsapp}</span>
                                </div>
                            )}

                            {/* SOCIALS */}
                            {showSocials && el('socials', 'bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2',
                                <>
                                    <span 
                                        contentEditable={editing === 'socials'}
                                        suppressContentEditableWarning
                                        onBlur={(e) => { setSocialHandle(e.currentTarget.textContent || ''); setEditing(null) }}
                                        className={`text-white font-bold text-sm tracking-wide outline-none drop-shadow-md ${editing === 'socials' ? 'ring-2 ring-white/50 rounded px-1' : ''}`}
                                    >
                                        {socialHandle}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current drop-shadow-md" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.44 3.29-1.43 4.54-1.03 1.3-2.58 2.16-4.25 2.38-1.74.22-3.56-.05-5.06-1.02-1.48-.96-2.54-2.5-2.85-4.23-.33-1.84.14-3.79 1.25-5.26 1.13-1.48 2.87-2.39 4.74-2.53V13c-.94.04-1.87.35-2.61.94-.74.57-1.18 1.44-1.28 2.37-.11 1.05.21 2.14.9 2.92.68.78 1.75 1.2 2.81 1.14 1.04-.06 2.02-.6 2.53-1.47.38-.66.56-1.42.56-2.18V.02z" /></svg>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Caption */}
                            {showCaptionOverlay && el('caption_overlay', 'left-4 bottom-16 w-44',
                                <>
                                    <p className="text-white/80 text-[10px] line-clamp-2 leading-relaxed">{caption}</p>
                                    <div className="flex items-center gap-1 mt-1 text-white/50">
                                        <Music className="w-3 h-3" />
                                        <span className="text-[9px]">{musicLabel}</span>
                                    </div>
                                </>
                            )}

                            {/* Filtre couleur */}
                            {colorFilter !== 'none' && (
                                <div className="absolute inset-0 z-30 pointer-events-none mix-blend-multiply"
                                    style={{ background: (filterOverlayStyle as any).background, filter: (filterOverlayStyle as any).filter }} />
                            )}

                            {/* Stickers draggables */}
                            {stickers.map((s, i) => (
                                <div
                                    key={i}
                                    className="absolute select-none cursor-move z-40"
                                    style={{ left: s.x, top: s.y, fontSize: '2rem', lineHeight: 1, userSelect: 'none', touchAction: 'none' }}
                                    onMouseDown={e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setDraggingSticker(i)
                                        setStickerDragStart({ mouseX: e.clientX, mouseY: e.clientY, posX: s.x, posY: s.y })
                                    }}
                                    onDoubleClick={e => { e.stopPropagation(); setStickers(prev => prev.filter((_, j) => j !== i)) }}
                                    title="Glisser pour déplacer · Double-clic pour supprimer"
                                >
                                    {s.emoji}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Image strip */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 flex gap-2">
                            {images.map((img, i) => (
                                <button key={i} onClick={() => setActiveImageIndex(i)}
                                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-purple-400 scale-110' : 'border-white/20 opacity-60'}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Hint */}
                    <div className="absolute bottom-4 right-4 text-white/20 text-[10px]">Double-clic = éditer · Glisser = déplacer</div>
                </main>

                {/* ═══ RIGHT PROPERTIES PANEL ═══ */}
                <aside className="w-56 bg-[#1a1a2e] border-l border-white/8 flex flex-col shrink-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/8">
                        <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                            {selectedElement ? `Élément: ${selectedElement}` : 'Propriétés'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {selectedElement === 'cover' && <>
                            <SliderRow label="Taille" value={Math.round(coverScale * 100)} min={40} max={250} unit="%" onChange={v => setCoverScale(v / 100)} color="purple" />
                            <SliderRow label="Rotation" value={coverRotation} min={-45} max={45} unit="°" onChange={setCoverRotation} color="purple" />
                            <SliderRow label="Opacité" value={Math.round(coverOpacity * 100)} min={10} max={100} unit="%" onChange={v => setCoverOpacity(v / 100)} color="purple" />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/50">Ombre</span>
                                <button onClick={() => setShowShadow(!showShadow)} className={`w-8 h-4 rounded-full transition-all ${showShadow ? 'bg-purple-500' : 'bg-white/20'}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5 ${showShadow ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </>}
                        {selectedElement === 'badge' && <>
                            <div>
                                <label className="text-[10px] text-white/40 mb-1 block">Texte badge</label>
                                <input value={badge} onChange={e => setBadge(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500" />
                            </div>
                        </>}
                        {selectedElement === 'price' && <>
                            <div>
                                <label className="text-[10px] text-white/40 mb-1 block">Prix</label>
                                <input value={price} onChange={e => setPrice(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500" />
                            </div>
                        </>}
                        {!selectedElement && (
                            <div className="text-center py-8">
                                <Move className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                <p className="text-white/20 text-xs">Cliquer un élément<br/>pour ses propriétés</p>
                            </div>
                        )}
                        {/* Always show general */}
                        <div className="border-t border-white/8 pt-4 space-y-3">
                            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Général</p>
                            <SliderRow label="Flou fond" value={bgBlur} min={0} max={40} unit="px" onChange={setBgBlur} color="blue" />
                            <SliderRow label="Opacité fond" value={Math.round(bgOpacity * 100)} min={0} max={100} unit="%" onChange={v => setBgOpacity(v / 100)} color="blue" />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

/* Composant slider réutilisable */
function SliderRow({ label, value, min, max, unit, onChange, color = 'purple' }: {
    label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void; color?: string
}) {
    const accentMap: Record<string, string> = { purple: 'accent-purple-500', blue: 'accent-blue-500', orange: 'accent-orange-500' }
    return (
        <div>
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span>{label}</span>
                <span className={color === 'purple' ? 'text-purple-400' : color === 'blue' ? 'text-blue-400' : 'text-orange-400'}>{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
                className={`w-full ${accentMap[color] || 'accent-purple-500'} h-1`} />
        </div>
    )
}
