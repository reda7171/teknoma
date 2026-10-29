'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Download, Repeat, BookOpen, ArrowRightLeft } from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { normalizeImage } from '@/lib/utils'

const Draggable = ({ children, defaultPos = { x: 0, y: 0 }, className = '' }: any) => {
    const [pos, setPos] = useState(defaultPos)
    const [isDragging, setIsDragging] = useState(false)
    const dragStart = useRef({ x: 0, y: 0 })

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return
            setPos({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])

    return (
        <div
            className={`cursor-move select-none ${className}`}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, zIndex: isDragging ? 50 : 10 }}
            onMouseDown={handleMouseDown}
            // Prevent child image drag from interfering with mouse movement
            onDragStart={(e) => e.preventDefault()}
        >
            {children}
        </div>
    )
}

interface ExchangeCreativeModalProps {
    isOpen: boolean
    onClose: () => void
    exchange: any | null
}

export default function ExchangeCreativeModal({ isOpen, onClose, exchange }: ExchangeCreativeModalProps) {
    const posterRef = useRef<HTMLDivElement>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [theme, setTheme] = useState<'gradient1' | 'gradient2' | 'dark' | 'light'>('gradient1')

    const [caption, setCaption] = useState(`Nouvel échange ! ${exchange?.bookRequested?.title} contre ${exchange?.type === 'DIRECT' && exchange?.bookOffered ? exchange.bookOffered.title : 'Crédits'}`)
    const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'both' | 'all'>('both')
    const [isPublishing, setIsPublishing] = useState(false)
    const [scheduleAt, setScheduleAt] = useState('')
    const [logoSize, setLogoSize] = useState(24)
    const [customBgImage, setCustomBgImage] = useState<string | null>(null)
    const [bgOpacity, setBgOpacity] = useState(100)

    if (!isOpen || !exchange) return null

    // Helper pour base64
    const toBase64 = async (url: string): Promise<string> => {
        try {
            if (url.startsWith('data:')) return url;
            let targetUrl = url;
            if (url.startsWith('http') && !url.includes(window.location.host)) {
                targetUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
            }
            const res = await fetch(targetUrl);
            if (!res.ok) throw new Error('Fetch failed');
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("Base64 conversion error:", err);
            return url;
        }
    }

    const patchImagesBase64 = async (node: HTMLDivElement) => {
        const imgs = node.querySelectorAll('img')
        const originals: { el: HTMLImageElement, src: string }[] = []
        await Promise.all(Array.from(imgs).map(async (img) => {
            const original = img.src
            originals.push({ el: img, src: original })
            const b64 = await toBase64(original)
            img.src = b64
        }))
        return originals
    }

    const restoreImages = (originals: { el: HTMLImageElement, src: string }[]) => {
        originals.forEach(({ el, src }) => { el.src = src })
    }

    const handleDownload = async () => {
        if (!posterRef.current) return
        let originals: { el: HTMLImageElement, src: string }[] = []
        try {
            setIsGenerating(true)
            originals = await patchImagesBase64(posterRef.current)
            await new Promise(resolve => setTimeout(resolve, 800))

            const dataUrl = await htmlToImage.toPng(posterRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
            })

            restoreImages(originals)

            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `exchange_${exchange.id}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error: any) {
            if (originals.length) restoreImages(originals)
            console.error('Erreur lors de la génération:', error)
            alert('Une erreur est survenue lors de la création de l\'image.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleQuickPublish = async () => {
        if (!exchange?.id || !posterRef.current) return alert('Erreur: ID de l\'échange ou référence manquante')
        setIsPublishing(true)
        try {
            // 1. Capturer l'image créative
            const originals = await patchImagesBase64(posterRef.current)
            await new Promise(resolve => setTimeout(resolve, 500))
            const dataUrl = await htmlToImage.toPng(posterRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
            })
            restoreImages(originals)

            // 2. Convertir dataUrl en File pour l'upload
            const arr = dataUrl.split(',')
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
            const bstr = atob(arr[1])
            let n = bstr.length
            const u8arr = new Uint8Array(n)
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
            }
            const blob = new Blob([u8arr], { type: mime })
            const file = new File([blob], `exchange_publish_${exchange.id}.png`, { type: mime })

            // 3. Uploader l'image sur le serveur
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const uploadData = await uploadRes.json()

            if (!uploadData.success) {
                throw new Error(uploadData.error || "Échec de l'upload de la créative")
            }

            // 4. Envoyer à n8n avec l'URL de la créative
            const res = await fetch('/api/n8n/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Nouvel échange sur PetsUnivers`,
                    format: 'square', // Default
                    platform: platform === 'all' ? 'both' : platform,
                    scheduleAt: scheduleAt || null,
                    customImageUrl: uploadData.url,
                    customCaption: caption
                })
            })
            const data = await res.json()
            if (data.success) {
                alert('✅ Créative publiée avec succès')
            } else {
                alert(`❌ Erreur: ${data.message || data.error}`)
            }
        } catch (error: any) {
            console.error('Erreur publication:', error)
            alert(`❌ Erreur technique: ${error.message || 'Inconnue'}`)
        } finally {
            setIsPublishing(false)
        }
    }

    const themes = {
        gradient1: {
            bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500',
            text: 'text-white',
            cardBg: 'bg-white/10 backdrop-blur-md',
            accent: 'text-pink-200'
        },
        gradient2: {
            bg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
            text: 'text-white',
            cardBg: 'bg-white/10 backdrop-blur-md',
            accent: 'text-emerald-100'
        },
        dark: {
            bg: 'bg-gradient-to-br from-gray-900 via-slate-800 to-black',
            text: 'text-white',
            cardBg: 'bg-white/5 backdrop-blur-md',
            accent: 'text-amber-400'
        },
        light: {
            bg: 'bg-gradient-to-br from-gray-50 via-gray-100 to-white',
            text: 'text-slate-900',
            cardBg: 'bg-white shadow-xl',
            accent: 'text-blue-600'
        }
    }

    const currentTheme = themes[theme]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] flex flex-col md:flex-row overflow-hidden shadow-2xl">

                {/* Aperçu */}
                <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center overflow-auto">
                    <div
                        ref={posterRef}
                        className={`relative w-[400px] h-[500px] ${customBgImage ? 'bg-black' : currentTheme.bg} overflow-hidden font-sans flex flex-col items-center justify-between p-8`}
                        style={{ aspectRatio: '4/5' }}
                    >
                        {customBgImage && (
                            <img
                                src={customBgImage}
                                alt="Custom Background"
                                className="absolute inset-0 w-full h-full object-cover z-0"
                                style={{ opacity: bgOpacity / 100 }}
                            />
                        )}
                        {/* Décoration fond (uniquement si pas d'image perso) */}
                        {!customBgImage && (
                            <>
                                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                                <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full bg-black/10 blur-3xl"></div>
                            </>
                        )}

                        {/* En-tête */}
                        <div className="w-full flex justify-between items-center z-10 relative">
                            <Draggable>
                                <div className={`${currentTheme.cardBg} px-4 py-1.5 rounded-full border border-white/20`}>
                                    <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${currentTheme.text}`}>
                                        {exchange.type === 'DIRECT' ? 'Échange de Livres' : 'Échange via Crédits'}
                                    </p>
                                </div>
                            </Draggable>
                            <Draggable>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/logo-petsunivers.png?v=petsunivers2" alt="PetsUnivers" crossOrigin="anonymous" style={{ height: logoSize }} className={`object-contain pointer-events-none ${theme !== 'light' ? 'filter brightness-0 invert' : ''}`} />
                            </Draggable>
                        </div>

                        {/* Contenu Central */}
                        <div className="flex items-center justify-between w-full z-10 gap-4 mt-8 relative">
                            {/* Livre 1 */}
                            <Draggable className="flex-1 flex flex-col items-center">
                                <div className="w-28 h-40 rounded-lg overflow-hidden shadow-2xl relative mb-4">
                                    {exchange.bookRequested?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={normalizeImage(exchange.bookRequested.image)}
                                            alt={exchange.bookRequested.title}
                                            crossOrigin="anonymous"
                                            className="w-full h-full object-cover pointer-events-none"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <BookOpen className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <p className={`text-sm font-black text-center ${currentTheme.text} line-clamp-2 leading-tight`}>
                                    {exchange.bookRequested?.title}
                                </p>
                                <div className="mt-2 text-center">
                                    <p className={`text-xs font-bold ${currentTheme.text}`}>
                                        {exchange.requester?.fullName || 'Utilisateur'}
                                    </p>
                                    <p className={`text-[10px] uppercase tracking-widest opacity-70 ${currentTheme.text}`}>
                                        {exchange.requester?.city}
                                    </p>
                                </div>
                            </Draggable>

                            {/* Icône d'échange */}
                            <Draggable className={`w-12 h-12 rounded-full ${currentTheme.cardBg} border border-white/20 flex items-center justify-center shrink-0 shadow-xl z-20`}>
                                <ArrowRightLeft className={`w-6 h-6 ${currentTheme.text} pointer-events-none`} />
                            </Draggable>

                            {/* Livre 2 ou Crédits */}
                            <Draggable className="flex-1 flex flex-col items-center">
                                {exchange.type === 'DIRECT' && exchange.bookOffered ? (
                                    <>
                                        <div className="w-28 h-40 rounded-lg overflow-hidden shadow-2xl relative mb-4">
                                            {exchange.bookOffered.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={normalizeImage(exchange.bookOffered.image)}
                                                    alt={exchange.bookOffered.title}
                                                    crossOrigin="anonymous"
                                                    className="w-full h-full object-cover pointer-events-none"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                    <BookOpen className="w-8 h-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm font-black text-center ${currentTheme.text} line-clamp-2 leading-tight`}>
                                            {exchange.bookOffered.title}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className={`w-28 h-40 rounded-lg ${currentTheme.cardBg} border border-white/20 flex flex-col items-center justify-center shadow-2xl mb-4 pointer-events-none`}>
                                            <span className="text-4xl mb-2">🪙</span>
                                            <span className={`text-lg font-black ${currentTheme.text}`}>Crédits</span>
                                        </div>
                                        <p className={`text-sm font-black text-center ${currentTheme.text} line-clamp-2 leading-tight pointer-events-none`}>
                                            Contre des crédits
                                        </p>
                                    </>
                                )}
                                <div className="mt-2 text-center">
                                    <p className={`text-xs font-bold ${currentTheme.text}`}>
                                        {exchange.responder?.fullName || 'Utilisateur'}
                                    </p>
                                    <p className={`text-[10px] uppercase tracking-widest opacity-70 ${currentTheme.text}`}>
                                        {exchange.responder?.city}
                                    </p>
                                </div>
                            </Draggable>
                        </div>

                        {/* Pied de page */}
                        <Draggable className="w-full text-center mt-8 z-10">
                            <h2 className={`text-2xl font-black italic tracking-tighter ${currentTheme.text} pointer-events-none`}>
                                Un nouveau match !
                            </h2>
                            <p className={`text-xs font-medium mt-1 opacity-80 ${currentTheme.text} pointer-events-none`}>
                                Rejoignez la communauté sur petsunivers.ma
                            </p>
                        </Draggable>
                    </div>
                </div>

                {/* Contrôles */}
                <div className="w-full md:w-[350px] bg-white border-l border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Image d'échange</h3>
                            <p className="text-xs text-gray-500 font-medium">Générez un visuel pour les réseaux sociaux</p>
                        </div>
                        <button aria-label="Fermer" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Thème Visuel</label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(themes).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => setTheme(key as any)}
                                        className={`h-16 rounded-xl border-2 transition-all ${value.bg} ${theme === key ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>

                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mt-6 mb-3">Image de Fond Personnalisée</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const url = URL.createObjectURL(file);
                                        setCustomBgImage(url);
                                    }
                                }}
                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {customBgImage && (
                                <div className="mt-4 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                                        Opacité de l'image ({bgOpacity}%)
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={bgOpacity}
                                        onChange={(e) => setBgOpacity(Number(e.target.value))}
                                        className="w-full accent-blue-500"
                                    />
                                    <button
                                        onClick={() => {
                                            setCustomBgImage(null)
                                            setBgOpacity(100)
                                        }}
                                        className="mt-2 text-[10px] font-bold text-red-500 hover:underline block"
                                    >
                                        Retirer l'image de fond
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Taille du Logo</label>
                            <input
                                type="range"
                                min="16"
                                max="100"
                                value={logoSize}
                                onChange={(e) => setLogoSize(Number(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Publication Automatique</h4>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Légende</label>
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-gray-50/50"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Plateforme</label>
                                <select aria-label="Champ de sélection"
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value as any)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none bg-gray-50/50"
                                >
                                    <option value="both">Facebook & Instagram</option>
                                    <option value="facebook">Facebook Uniquement</option>
                                    <option value="instagram">Instagram Uniquement</option>
                                    <option value="tiktok">TikTok</option>
                                    <option value="all">Toutes (FB, IG, TikTok)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Programmation (Optionnel)</label>
                                <input
                                    type="datetime-local"
                                    value={scheduleAt}
                                    onChange={(e) => setScheduleAt(e.target.value)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none bg-gray-50/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3 shrink-0">
                        <button
                            onClick={handleQuickPublish}
                            disabled={isPublishing || isGenerating}
                            className="w-full flex items-center justify-center py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                        >
                            {isPublishing ? (
                                <span className="animate-pulse">Publication en cours...</span>
                            ) : (
                                <>Publier via n8n</>
                            )}
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isGenerating || isPublishing}
                            className="w-full flex items-center justify-center py-3.5 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <span className="animate-pulse">Génération...</span>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Télécharger
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
