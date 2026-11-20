'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Download, ImageIcon, Facebook, Instagram, Eye, Clock, Send, Music, Sparkles, Maximize2, ZoomIn } from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { injectXMPToPNG } from '@/lib/pngXmpInjector'
import { normalizeImage } from '@/lib/utils'

interface BookCreativeModalProps {
    isOpen: boolean
    onClose: () => void
    book: {
        id?: string
        title: string
        author: string
        price: number
        image: string
        category?: string | null
    } | null
    format?: 'post' | 'story'
    onAutoCapture?: (uploadUrl: string) => void  // pub en boucle : capture auto
    initialLogoVariant?: 'tekno' | 'jumia'
}

export default function BookCreativeModal({ isOpen, onClose, book, format = 'post', onAutoCapture, initialLogoVariant }: BookCreativeModalProps) {
    const posterRef = useRef<HTMLDivElement>(null)
    const posterRefTekno Store = useRef<HTMLDivElement>(null)
    const posterRefJumia = useRef<HTMLDivElement>(null)
    const [previewTab, setPreviewTab] = useState<'both' | 'tekno' | 'jumia'>('both')
    const [fullscreenVariant, setFullscreenVariant] = useState<'tekno' | 'jumia' | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [theme, setTheme] = useState<'dark' | 'light' | 'orange' | 'magenta' | 'emerald' | 'gold' | 'purple'>('dark')
    const [logoVariant, setLogoVariant] = useState<'tekno' | 'jumia'>(initialLogoVariant || 'tekno')

    useEffect(() => {
        if (initialLogoVariant) {
            setLogoVariant(initialLogoVariant)
            setPreviewTab(initialLogoVariant)
        }
    }, [initialLogoVariant, isOpen])

    // Interactive States
    const [positions, setPositions] = useState({
        badge: { x: 0, y: 0 },
        logo: { x: 0, y: 0 },
        book: { x: 0, y: -60 },
        title: { x: 0, y: 0 },
        author: { x: 0, y: 0 },
        price: { x: 0, y: 0 },
        delivery: { x: 0, y: 0 },
        bg: { x: 0, y: 0 },
        whatsapp: { x: 0, y: 0 },
        socials: { x: 0, y: 0 }
    })
    const [dragging, setDragging] = useState<string | null>(null)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    // Quel élément est en mode édition (double-clic requis)
    const [editing, setEditing] = useState<string | null>(null)
    const [imageScale, setImageScale] = useState(1)
    const [imageRotation, setImageRotation] = useState(0)
    const [logoScale, setLogoScale] = useState(1)
    const [showLogo, setShowLogo] = useState(true)
    const [showFreeDelivery, setShowFreeDelivery] = useState(false)
    const [showShadow, setShowShadow] = useState(true)
    const [showPrice, setShowPrice] = useState(true)
    const [showSolde, setShowSolde] = useState(true)
    const [showWhatsapp, setShowWhatsapp] = useState(true)
    const [whatsappScale, setWhatsappScale] = useState(1)
    const [showSocials, setShowSocials] = useState(true)
    const [socialsScale, setSocialsScale] = useState(1)
    const [bgImage, setBgImage] = useState<string | null>(null)
    const [bgOpacity, setBgOpacity] = useState(1)
    const [imageOpacity, setImageOpacity] = useState(1)

    // Publication States
    const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'all'>('all')
    const [useDescription, setUseDescription] = useState<'short' | 'long'>('short')
    const [scheduleAt, setScheduleAt] = useState('')
    const [showPublishOptions, setShowPublishOptions] = useState(false)
    const [fullBookData, setFullBookData] = useState<any>(null)
    const [caption, setCaption] = useState('')

    const [editableTexts, setEditableTexts] = useState({
        badge: book?.category || 'Recommandation',
        title: book?.title || 'Titre',
        author: `par ${book?.author || 'Auteur'}`,
        price: book?.price?.toString() || '0',
        oldPrice: (book?.price ? Math.round(book.price * 1.3) : 0).toString(),
        delivery_line1: 'Livraison',
        delivery_line2: 'Gratuite',
        whatsapp: '+212 702 220 575',
        socialHandle: '@tekno.book'
    })

    const handleTextChange = (key: string, value: string) => {
        setEditableTexts(prev => ({ ...prev, [key]: value }))
    }

    const handleMouseDown = (e: React.MouseEvent, key: string) => {
        // Si on est en mode édition pour cet élément, ne pas démarrer le drag
        if (editing === key) return
        e.preventDefault()
        setDragging(key)
        const pos = positions[key as keyof typeof positions]
        setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
    }

    const handleTouchStart = (e: React.TouchEvent, key: string) => {
        if (editing === key) return
        e.preventDefault()
        const touch = e.touches[0]
        setDragging(key)
        const pos = positions[key as keyof typeof positions]
        setOffset({ x: touch.clientX - pos.x, y: touch.clientY - pos.y })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return
            setPositions(prev => ({ ...prev, [dragging]: { x: e.clientX - offset.x, y: e.clientY - offset.y } }))
        }
        const handleMouseUp = () => setDragging(null)

        const handleTouchMove = (e: TouchEvent) => {
            if (!dragging) return
            const touch = e.touches[0]
            setPositions(prev => ({ ...prev, [dragging]: { x: touch.clientX - offset.x, y: touch.clientY - offset.y } }))
        }
        const handleTouchEnd = () => setDragging(null)

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            window.addEventListener('touchmove', handleTouchMove, { passive: false })
            window.addEventListener('touchend', handleTouchEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [dragging, offset])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && fullscreenVariant) {
                setFullscreenVariant(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [fullscreenVariant])

    useEffect(() => {
        if (!isOpen) {
            setFullscreenVariant(null)
            setTheme('dark') // reset
            setPositions({ badge: { x: 0, y: 0 }, logo: { x: 0, y: 0 }, book: { x: 0, y: -60 }, title: { x: 0, y: 0 }, author: { x: 0, y: 0 }, price: { x: 0, y: 0 }, delivery: { x: 0, y: 0 }, bg: { x: 0, y: 0 }, whatsapp: { x: 0, y: 0 }, socials: { x: 0, y: 0 } })
            setImageScale(1)
            setImageRotation(0)
            setLogoScale(3)
            setShowFreeDelivery(false)
            setShowShadow(true)
            setShowPrice(true)
            setShowSolde(true)
            setShowWhatsapp(true)
            setWhatsappScale(1)
            setShowSocials(true)
            setSocialsScale(1)
        } else if (book) {
            setEditableTexts({
                badge: book.category || 'Recommandation',
                title: book.title,
                author: `par ${book.author}`,
                price: book.price.toString(),
                oldPrice: Math.round(book.price * 1.3).toString(),
                delivery_line1: 'Livraison',
                delivery_line2: 'Gratuite',
                whatsapp: '+212 600 00 00 00',
                socialHandle: '@tekno.book'
            })
            // Fetch site settings for WhatsApp phone number
            let whatsappPhone = '+212 600 00 00 00'
            fetch('/api/admin/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.settings?.contact_phone) {
                        whatsappPhone = data.settings.contact_phone
                        setEditableTexts(prev => ({ ...prev, whatsapp: data.settings.contact_phone }))
                    }
                })
                .catch(console.error)
            // Fetch full book details for preview
            fetch(`/api/admin/books/${book.id}`).then(res => res.json()).then(data => {
                if (data.success) {
                    setFullBookData(data.book)
                    const baseDesc = useDescription === 'long' ? (data.book.longDescription || data.book.description) : data.book.description
                    const productUrl = `${window.location.origin}/fr/books/${data.book.id}`
                    const waPhone = whatsappPhone.replace(/[^0-9+]/g, '')
                    const waLink = `https://wa.me/${waPhone.startsWith('+') ? waPhone.slice(1) : waPhone}`
                    const hashtags = `#tekno #lecture #livre #maroc #culture ${data.book.category ? `#${data.book.category.toLowerCase().replace(/\s+/g, '')}` : ''}`
                    setCaption(`${baseDesc}\n\n📖 Lien pour commander : ${productUrl}\n💰 Prix : ${data.book.price} درهم\n🚚 Paiement à la livraison + Livraison rapide !\n\n💬 Commander via WhatsApp : ${waLink}\n\n${hashtags}`)
                }
            }).catch(console.error)
        }
    }, [isOpen, book])

    // Update caption when description type changes
    useEffect(() => {
        if (fullBookData) {
            const baseDesc = useDescription === 'long' ? (fullBookData.longDescription || fullBookData.description) : fullBookData.description
            const productUrl = `${window.location.origin}/fr/books/${fullBookData.id}`
            const waPhone = editableTexts.whatsapp.replace(/[^0-9+]/g, '')
            const waLink = `https://wa.me/${waPhone.startsWith('+') ? waPhone.slice(1) : waPhone}`
            const hashtags = `#tekno #lecture #livre #maroc #culture ${fullBookData.category ? `#${fullBookData.category.toLowerCase().replace(/\s+/g, '')}` : ''}`
            setCaption(`${baseDesc}\n\n📖 Lien pour commander : ${productUrl}\n💰 Prix : ${fullBookData.price} درهم\n🚚 Paiement à la livraison + Livraison rapide !\n\n💬 Commander via WhatsApp : ${waLink}\n\n${hashtags}`)
        }
    }, [useDescription, fullBookData, editableTexts.whatsapp])

    // Auto-capture pour la publication en boucle
    useEffect(() => {
        if (!onAutoCapture || !isOpen || !book) return
        let isMounted = true

        const run = async () => {
            await new Promise(r => setTimeout(r, 1200)) // attendre le rendu
            if (!isMounted) return

            const node = posterRef.current
            if (!node || !node.ownerDocument || !node.isConnected) {
                console.warn('[AutoCapture] Poster element not ready or disconnected')
                return
            }

            try {
                const originals = await patchImagesBase64(node)
                await new Promise(r => setTimeout(r, 500))

                if (!isMounted || !node.isConnected) {
                    restoreImages(originals)
                    return
                }

                let dataUrl: string = ''
                try {
                    dataUrl = await htmlToImage.toPng(node, { quality: 1, pixelRatio: 2, cacheBust: false })
                } catch (e) {
                    console.warn('[AutoCapture] First attempt failed, retrying with skipFonts: true', e);
                    if (isMounted && node && node.isConnected) {
                        dataUrl = await htmlToImage.toPng(node, { quality: 1, pixelRatio: 2, cacheBust: false, skipFonts: true })
                    }
                }

                restoreImages(originals)
                if (isMounted && dataUrl) {
                    onAutoCapture(dataUrl)
                }
            } catch (e) {
                console.error('[AutoCapture] Fatal Error:', e)
                if (isMounted) {
                    onAutoCapture('')
                }
            }
        }
        run()

        return () => {
            isMounted = false
        }
    }, [isOpen, book, format, onAutoCapture])

    // Convertit une URL image en base64 via canvas pour contourner CORS
    const toBase64 = async (url: string): Promise<string> => {
        try {
            if (url.startsWith('data:')) return url;
            let targetUrl = url;
            if (url.startsWith('http') && !url.includes(window.location.host)) {
                targetUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
            }
            const res = await fetch(targetUrl);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err: any) {
            console.warn("Base64 conversion fallback:", err?.message || err);
            // Fallback to a placeholder image so htmlToImage doesn't crash, and we see something instead of a blank space
            return '/book-placeholder.png';
        }
    }

    const patchImagesBase64 = async (node: HTMLDivElement) => {
        if (!node) return []
        const imgs = node.querySelectorAll('img')
        const originals: { el: HTMLImageElement, src: string }[] = []
        await Promise.all(Array.from(imgs).map(async (img) => {
            try {
                const original = img.src
                originals.push({ el: img, src: original })
                const b64 = await toBase64(original)
                if (b64 && b64.startsWith('data:')) {
                    await new Promise((resolve) => {
                        const imgCopy = new Image();
                        imgCopy.onload = resolve;
                        imgCopy.onerror = resolve;
                        imgCopy.src = b64;
                    });
                    img.src = b64;
                }
            } catch (err) {
                console.warn('patchImagesBase64 failed for image:', err)
            }
        }))
        return originals
    }

    const restoreImages = (originals: { el: HTMLImageElement, src: string }[]) => {
        originals.forEach(({ el, src }) => { el.src = src })
    }

    if (!isOpen || !book) return null


    const capturePosterNode = async (node: HTMLDivElement | null): Promise<string> => {
        if (!node || !node.ownerDocument || !node.isConnected) throw new Error('Poster introuvable')
        const originals = await patchImagesBase64(node)
        await new Promise(resolve => setTimeout(resolve, 800))

        if (!node || !node.ownerDocument || !node.isConnected) {
            restoreImages(originals)
            throw new Error('Poster introuvable')
        }

        let dataUrl: string
        try {
            dataUrl = await htmlToImage.toPng(node, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
                skipFonts: false,
            })
        } catch (e) {
            if (!node || !node.ownerDocument || !node.isConnected) {
                restoreImages(originals)
                throw new Error('Poster introuvable')
            }
            dataUrl = await htmlToImage.toPng(node, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
                skipFonts: true,
            })
        }

        restoreImages(originals)

        let finalDataUrl = dataUrl
        try {
            const keywords = ['Tekno Store', 'Jumia', 'Livre', book.title, book.author, 'Lecture', 'Maroc']
            finalDataUrl = injectXMPToPNG(dataUrl, book.title, keywords.filter(Boolean))
        } catch (err) {
            console.error("XMP injection failed:", err)
        }
        return finalDataUrl
    }

    const captureCurrentPoster = async (): Promise<string> => {
        const target = (logoVariant === 'jumia' ? (posterRefJumia.current || posterRef.current) : (posterRefTekno Store.current || posterRef.current)) || posterRef.current
        return capturePosterNode(target)
    }

    const downloadDataUrl = (dataUrl: string, suffix: string) => {
        const cleanTitle = book.title.replace(/[\/\\?%*:|"<>]/g, '-')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `${cleanTitle} - ${suffix}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDownload = async () => {
        try {
            setIsGenerating(true)
            const target = (logoVariant === 'jumia' ? (posterRefJumia.current || posterRef.current) : (posterRefTekno Store.current || posterRef.current)) || posterRef.current
            const finalDataUrl = await capturePosterNode(target)
            downloadDataUrl(finalDataUrl, logoVariant === 'jumia' ? 'Jumia' : 'Tekno Store')
        } catch (error: any) {
            console.error('Erreur lors de la génération:', error)
            const errorMsg = error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de l\'image.'
            alert(errorMsg)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadTekno Store = async () => {
        try {
            setIsGenerating(true)
            const target = posterRefTekno Store.current || posterRef.current
            const url = await capturePosterNode(target)
            downloadDataUrl(url, 'Tekno Store')
        } catch (err: any) {
            alert(err?.message || 'Erreur lors du téléchargement Tekno Store')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadJumia = async () => {
        try {
            setIsGenerating(true)
            const target = posterRefJumia.current || posterRef.current
            const url = await capturePosterNode(target)
            downloadDataUrl(url, 'Jumia')
        } catch (err: any) {
            alert(err?.message || 'Erreur lors du téléchargement Jumia')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadBoth = async () => {
        try {
            setIsGenerating(true)
            const targetTekno Store = posterRefTekno Store.current || posterRef.current
            const targetJumia = posterRefJumia.current || posterRef.current

            if (targetTekno Store) {
                const teknoUrl = await capturePosterNode(targetTekno Store)
                downloadDataUrl(teknoUrl, 'Tekno Store')
                await new Promise(resolve => setTimeout(resolve, 600))
            }

            if (targetJumia) {
                const jumiaUrl = await capturePosterNode(targetJumia)
                downloadDataUrl(jumiaUrl, 'Jumia')
            }
        } catch (error: any) {
            console.error('Erreur lors du téléchargement des 2 images:', error)
            const errorMsg = error instanceof Error ? error.message : 'Une erreur est survenue lors du téléchargement des 2 images.'
            alert(errorMsg)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleShare = async (platform: 'facebook' | 'instagram') => {
        if (!posterRef.current || !book) return
        try {
            setIsGenerating(true)
            const originals = await patchImagesBase64(posterRef.current)
            await new Promise(resolve => setTimeout(resolve, 800))

            const dataUrl = await htmlToImage.toPng(posterRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
                skipFonts: false,
            }).catch(err => {
                if (err instanceof Event) {
                    throw new Error("Une image n'a pas pu être chargée. Le partage a échoué.")
                }
                throw err
            })

            restoreImages(originals)

            // Safely convert dataUrl to Blob
            const arr = dataUrl.split(',')
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
            const bstr = atob(arr[1])
            let n = bstr.length
            const u8arr = new Uint8Array(n)
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
            }
            const blob = new Blob([u8arr], { type: mime })
            const file = new File([blob], `${book.title.replace(/[\/\\?%*:|"<>]/g, '-')}.png`, { type: mime })

            // Try Web Share API first
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: book.title,
                    text: `Découvrez notre livre : ${book.title} !`
                })
                return
            }

            // Fallback for Desktop: Copy to clipboard
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ])
                alert(`L'image a été copiée dans votre presse-papiers ! Vous allez être redirigé vers ${platform === 'facebook' ? 'Facebook' : 'Instagram'}. Il vous suffira de faire "Coller" (Ctrl+V) pour la publier.`)
            } catch (clipboardError) {
                console.warn('Clipboard write failed', clipboardError)
                alert(`Impossible de copier l'image automatiquement. L'API de partage n'est pas supportée par votre navigateur actuel.`)
                return
            }

            // Open social media for pasting
            if (platform === 'facebook') window.open('https://www.facebook.com', '_blank')
            if (platform === 'instagram') window.open('https://www.instagram.com', '_blank')

        } catch (err: any) {
            console.error('Erreur technique lors du partage:', err)
            const errorMsg = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création de l\'image.'
            alert(errorMsg)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleQuickPublish = async () => {
        if (!book?.id || !posterRef.current) return alert('Erreur: ID du livre ou référence poster manquante')
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
            const file = new File([blob], `creative_publish_${book.id}.png`, { type: mime })

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
                    bookId: book.id,
                    format: format,
                    platform: platform === 'all' ? 'both' : platform,
                    useDescription: useDescription,
                    scheduleAt: scheduleAt || null,
                    customImageUrl: uploadData.url, // Utiliser l'image qu'on vient d'uploader
                    customCaption: caption // Passer la légende modifiée
                })
            })
            const data = await res.json()
            if (data.success) {
                alert('✅ Créative publiée avec succès sur FB et Instagram')
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


    const handlePreview = async () => {
        if (!posterRef.current || !book) return
        try {
            setIsGenerating(true)
            const originals = await patchImagesBase64(posterRef.current)
            await new Promise(resolve => setTimeout(resolve, 500))
            const dataUrl = await htmlToImage.toPng(posterRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: 'transparent',
                cacheBust: false,
            })
            restoreImages(originals)

            const baseUrl = window.location.origin
            const productUrl = `${baseUrl}/fr/books/${book.id}`
            const text = caption || book.title

            const tags = `#tekno #lecture #livre #maroc #culture ${book.category ? `#${book.category.toLowerCase().replace(/\s+/g, '')}` : ''}`

            const newWindow = window.open()
            if (newWindow) {
                newWindow.document.write(`
                    <html lang="fr">
                        <head>
                            <title>Aperçu Publication - ${book.title}</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <style>
                                body { margin: 0; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; padding: 20px; }
                                .post-container { background: white; width: 100%; max-width: 500px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); overflow: hidden; }
                                .post-header { padding: 12px 16px; display: flex; items-center; gap: 10px; }
                                .avatar { width: 40px; h-height: 40px; background: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
                                .author-info { flex: 1; }
                                .author-name { font-weight: 600; font-size: 15px; color: #050505; }
                                .post-time { font-size: 13px; color: #65676b; }
                                .post-text { padding: 4px 16px 12px; font-size: 15px; line-height: 1.4; color: #050505; white-space: pre-wrap; }
                                .post-image { width: 100%; display: block; border-top: 1px solid #ebedf0; border-bottom: 1px solid #ebedf0; }
                                .post-tags { padding: 8px 16px; color: #1877f2; font-size: 15px; }
                                .post-link { padding: 12px 16px; background: #f0f2f5; font-size: 13px; color: #65676b; border-top: 1px solid #ebedf0; }
                                .post-link a { color: #1877f2; text-decoration: none; font-weight: 600; }
                                .post-actions { padding: 4px 12px; border-top: 1px solid #ebedf0; display: flex; gap: 20px; }
                                .action { flex: 1; display: flex; items-center; justify-content: center; gap: 8px; padding: 6px; color: #65676b; font-weight: 600; font-size: 14px; border-radius: 4px; }
                                .badge { position: absolute; top: 10px; right: 10px; background: #1877f2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                                .preview-label { text-align: center; color: #65676b; font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <div style="width: 100%; max-width: 500px;">
                                <div class="preview-label">Aperçu de la publication sociale</div>
                                <div class="post-container">
                                    <div class="post-header">
                                        <div class="avatar">R</div>
                                        <div class="author-info">
                                            <div class="author-name">Tekno Store</div>
                                            <div class="post-time">À l'instant • 🌐</div>
                                        </div>
                                    </div>
                                    <div class="post-text">${text}</div>
                                    <div style="position: relative;">
                                        <img class="post-image" src="${dataUrl}" />
                                    </div>
                                    <div class="post-tags">${tags}</div>
                                    <div class="post-link">
                                        📖 Voir plus ici : <a href="${productUrl}" target="_blank">${productUrl}</a>
                                    </div>
                                    <div class="post-actions">
                                        <div class="action">👍 J'aime</div>
                                        <div class="action">💬 Commenter</div>
                                        <div class="action">↪️ Partager</div>
                                    </div>
                                </div>
                            </div>
                        </body>
                    </html>
                `)
            }
        } catch (error) {
            console.error('Preview error:', error)
            alert("Erreur lors de l'aperçu")
        } finally {
            setIsGenerating(false)
        }
    }

    const themes = {
        dark: {
            bg: 'bg-gradient-to-br from-gray-900 via-slate-800 to-black',
            text: 'text-white',
            accent: 'text-amber-400',
            cardBg: 'bg-black/40',
            border: 'border-gray-600'
        },
        light: {
            bg: 'bg-gradient-to-br from-stone-50 via-gray-100 to-stone-200',
            text: 'text-gray-900',
            accent: 'text-blue-600',
            cardBg: 'bg-white/90',
            border: 'border-gray-300'
        },
        orange: {
            bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-red-500',
            text: 'text-white',
            accent: 'text-yellow-200',
            cardBg: 'bg-black/30',
            border: 'border-orange-300'
        },
        magenta: {
            bg: 'bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600',
            text: 'text-white',
            accent: 'text-pink-100',
            cardBg: 'bg-white/30',
            border: 'border-pink-300'
        },
        emerald: {
            bg: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-green-700',
            text: 'text-white',
            accent: 'text-green-100',
            cardBg: 'bg-black/30',
            border: 'border-green-300'
        },
        gold: {
            bg: 'bg-gradient-to-br from-amber-200 via-yellow-400 to-orange-500',
            text: 'text-slate-900',
            accent: 'text-slate-800',
            cardBg: 'bg-white/80',
            border: 'border-amber-300'
        },
        purple: {
            bg: 'bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900',
            text: 'text-white',
            accent: 'text-violet-200',
            cardBg: 'bg-black/30',
            border: 'border-violet-400'
        }
    }

    const currentTheme = themes[theme]

    // Mode visible pour la capture en boucle (autocapture en direct)
    if (onAutoCapture) {
        return (
            <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
                <div className="text-white font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />
                    Génération en cours...
                </div>
                <div
                    ref={posterRef}
                    className={`relative ${format === 'story' ? 'w-[360px] min-h-[640px]' : 'w-[500px] h-[500px]'} ${bgImage ? '' : currentTheme.bg} overflow-hidden font-sans flex flex-col`}
                    style={{ aspectRatio: format === 'story' ? '9/16' : '1/1' }}
                >
                    {bgImage && <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', opacity: bgOpacity }} />}
                    {!bgImage && (<><div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)' }} /><div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)' }} /></>)}
                    <div className="pt-8 px-8 flex justify-between items-start z-10">
                        <div className={`${currentTheme.cardBg} px-4 py-1.5 rounded-full ${currentTheme.border} border backdrop-blur-md`}><p className={`text-[10px] font-black tracking-[0.2em] uppercase ${currentTheme.text} opacity-90`}>{editableTexts.badge}</p></div>
                        {showLogo && (
                            <div
                                className="flex items-center justify-end origin-top-right"
                                style={{ transform: `translate(${positions.logo.x}px, ${positions.logo.y}px)` }}
                            >
                                <img
                                    src={logoVariant === 'jumia' ? '/logo-jumia.png?v=jumia_v3' : '/logo.png?v=tekno2'}
                                    alt={logoVariant === 'jumia' ? 'Jumia' : 'Tekno Store'}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    className={`object-contain origin-top-right ${
                                        logoVariant === 'jumia'
                                            ? 'h-7 sm:h-8 max-w-[140px]'
                                            : 'h-9 sm:h-11 max-w-[120px] filter brightness-0 invert'
                                    }`}
                                    style={{
                                        transform: `scale(${logoScale})`,
                                        transformOrigin: 'top right'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div className={`flex-1 flex items-center justify-center px-12 ${format === 'story' ? 'py-12' : 'py-6'} relative z-30`}>
                        <div
                            className={`relative w-full ${format === 'story' ? 'max-w-[220px]' : 'max-w-[200px]'} mx-auto`}
                            style={{ transform: `translate(${positions.book.x}px, ${positions.book.y}px)` }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={(() => {
                                let img = normalizeImage(book.image);
                                // Unconditionally strip production domain so images are relative
                                // This prevents CORS errors when fetching the image for base64 conversion
                                img = img.replace('https://tekno.ma', '');
                                return img.startsWith('http') && !img.includes(window.location.host) ? `/api/proxy/image?url=${encodeURIComponent(img)}` : img || '/book-placeholder.png';
                            })()} alt={book.title} onError={(e) => { e.currentTarget.src = '/book-placeholder.png'; }} className="relative w-full h-auto object-cover rounded shadow-2xl" style={{ boxShadow: showShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none', transform: `scale(${imageScale}) rotate(${imageRotation}deg)`, opacity: imageOpacity }} />
                        </div>
                    </div>
                    {showPrice && (
                        <div className="absolute bottom-16 left-1/2" style={{ transform: 'translate(-50%, 0)' }}>
                            <div className="flex items-center gap-3">
                                {showSolde && <div className="text-red-500 font-bold text-xl line-through flex items-baseline gap-1"><span>{editableTexts.oldPrice}</span><span className="text-sm">درهم</span></div>}
                                <div className={`${currentTheme.accent} font-black text-3xl flex items-baseline gap-1`}><span>{editableTexts.price}</span><span className="text-xl">درهم</span></div>
                            </div>
                        </div>
                    )}
                    {showWhatsapp && (
                        <div className="absolute bottom-4 right-4 z-10">
                            <div className="flex items-center gap-1.5 bg-[#25D366] text-white rounded-full px-3 py-1 shadow-lg text-sm font-bold">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                {editableTexts.whatsapp}
                            </div>
                        </div>
                    )}
                    {/* Icônes réseaux sociaux — identique au template principal */}
                    {showSocials && (
                        <div className="absolute bottom-4 left-4 z-10 flex flex-col items-center gap-2">
                            <span className="text-white font-bold text-sm tracking-wide">{editableTexts.socialHandle}</span>
                            <div className="flex items-center gap-1.5">
                                {/* Instagram */}
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                </div>
                                {/* Facebook */}
                                <div className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                </div>
                                {/* Pinterest */}
                                <div className="w-7 h-7 rounded-full bg-[#E60023] flex items-center justify-center text-white">
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.163 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.624 0 12.017 0z"/></svg>
                                </div>
                                {/* TikTok */}
                                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white border border-white/20">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.44 3.29-1.43 4.54-1.03 1.3-2.58 2.16-4.25 2.38-1.74.22-3.56-.05-5.06-1.02-1.48-.96-2.54-2.5-2.85-4.23-.33-1.84.14-3.79 1.25-5.26 1.13-1.48 2.87-2.39 4.74-2.53V13c-.94.04-1.87.35-2.61.94-.74.57-1.18 1.44-1.28 2.37-.11 1.05.21 2.14.9 2.92.68.78 1.75 1.2 2.81 1.14 1.04-.06 2.02-.6 2.53-1.47.38-.66.56-1.42.56-2.18V.02z" /></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const handleCardClick = (variant: 'tekno' | 'jumia', e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (dragging || target.isContentEditable || target.closest('button') || target.closest('input')) {
            return
        }
        setFullscreenVariant(variant)
    }

    const renderPoster = (
        variant: 'tekno' | 'jumia',
        containerRef?: React.RefObject<HTMLDivElement | null> | null,
        isInteractive = true,
        customClassName?: string
    ) => (
        <div
            ref={containerRef || undefined}
            className={`relative ${customClassName ? customClassName : (format === 'story' ? 'w-[360px] min-h-[640px]' : 'w-[480px] h-[480px] max-w-full')} ${bgImage ? '' : currentTheme.bg} overflow-hidden font-sans flex flex-col transition-all duration-300 shadow-2xl rounded-2xl select-none`}
            style={{
                aspectRatio: format === 'story' ? '9/16' : '1/1',
            }}
        >
            {/* Custom Background Image Layer */}
            {bgImage && (
                <div
                    className={`absolute inset-0 z-0 cursor-move ${dragging === 'bg' ? '' : 'transition-transform'}`}
                    style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: bgOpacity,
                        transform: `translate(${positions.bg.x}px, ${positions.bg.y}px) scale(1.1)`,
                        touchAction: 'none'
                    }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'bg')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'bg')}
                />
            )}
            {/* Background Decor (Only if no custom bg) */}
            {!bgImage && (
                <>
                    <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)' }}></div>
                    <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)' }}></div>
                </>
            )}

            {/* Top Label & Logo */}
            <div className="pt-8 px-8 flex justify-between items-start z-10 select-none">
                <div
                    className={`cursor-move ${dragging === 'badge' ? '' : 'transition-transform active:scale-95'}`}
                    style={{ transform: `translate(${positions.badge.x}px, ${positions.badge.y}px)`, touchAction: 'none' }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'badge')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'badge')}
                >
                    <div className={`${currentTheme.cardBg} px-4 py-1.5 rounded-full ${currentTheme.border} border backdrop-blur-md`}>
                        <p
                            contentEditable={isInteractive}
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange('badge', e.currentTarget.textContent || '')}
                            className={`text-[10px] font-black tracking-[0.2em] uppercase ${currentTheme.text} opacity-90 outline-none`}
                        >
                            {editableTexts.badge}
                        </p>
                    </div>
                </div>

                {showLogo && (
                    <div
                        className={`cursor-move ${dragging === 'logo' ? '' : 'transition-transform active:scale-95'} opacity-95 flex items-center justify-end origin-top-right`}
                        style={{ transform: `translate(${positions.logo.x}px, ${positions.logo.y}px)`, touchAction: 'none' }}
                        onMouseDown={(e) => isInteractive && handleMouseDown(e, 'logo')}
                        onTouchStart={(e) => isInteractive && handleTouchStart(e, 'logo')}
                        title="Déplacer le logo"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={variant === 'jumia' ? '/logo-jumia.png?v=jumia_v3' : '/logo.png?v=tekno2'}
                            alt={variant === 'jumia' ? 'Jumia Logo' : 'Tekno Store Logo'}
                            crossOrigin="anonymous"
                            className={`object-contain transition-transform origin-top-right select-none ${
                                variant === 'jumia'
                                    ? 'h-7 sm:h-8 max-w-[140px]'
                                    : 'h-9 sm:h-11 max-w-[120px] filter brightness-0 invert'
                            }`}
                            style={{
                                transform: `scale(${logoScale})`,
                                transformOrigin: 'top right'
                            }}
                        />
                    </div>
                )}
            </div>

            {showFreeDelivery && (
                <div
                    className={`flex flex-col items-center select-none absolute top-32 right-8 cursor-move z-20 ${dragging === 'delivery' ? '' : 'transition-transform active:scale-95'}`}
                    style={{ transform: `translate(${positions.delivery.x}px, ${positions.delivery.y}px)`, touchAction: 'none' }}
                    onMouseDown={(e) => {
                        if (!isInteractive) return
                        e.stopPropagation();
                        handleMouseDown(e, 'delivery');
                    }}
                    onTouchStart={(e) => {
                        if (!isInteractive) return
                        e.stopPropagation();
                        handleTouchStart(e, 'delivery');
                    }}
                >
                    <span className="text-5xl mb-1 filter drop-shadow-2xl">🚚</span>
                    <div className="flex flex-col items-center leading-tight">
                        <span
                            contentEditable={isInteractive}
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange('delivery_line1', e.currentTarget.textContent || '')}
                            className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50 outline-none"
                        >
                            {editableTexts.delivery_line1}
                        </span>
                        <span
                            contentEditable={isInteractive}
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange('delivery_line2', e.currentTarget.textContent || '')}
                            className="text-xs font-black uppercase tracking-widest text-green-400 outline-none"
                        >
                            {editableTexts.delivery_line2}
                        </span>
                    </div>
                </div>
            )}

            {/* Center Content (Book Cover) */}
            <div className={`flex-1 flex items-center justify-center px-12 ${format === 'story' ? 'py-12' : 'py-6'} relative z-30 pointer-events-none`}>
                <div
                    className={`relative w-full ${format === 'story' ? 'max-w-[220px]' : 'max-w-[200px]'} mx-auto perspective-1000 cursor-move pointer-events-auto ${dragging === 'book' ? '' : 'transition-transform active:scale-95'}`}
                    style={{ transform: `translate(${positions.book.x}px, ${positions.book.y}px)`, touchAction: 'none' }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'book')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'book')}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={(() => {
                            const img = normalizeImage(book.image);
                            if (img.startsWith('http') && !img.includes(typeof window !== 'undefined' ? window.location.host : '')) {
                                return `/api/proxy/image?url=${encodeURIComponent(img)}`;
                            }
                            return img;
                        })() || '/book-placeholder.png'}
                        alt={book.title}
                        crossOrigin="anonymous"
                        className="relative w-full h-auto object-cover rounded shadow-2xl transition-transform"
                        style={{
                            boxShadow: showShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
                            transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                            opacity: imageOpacity
                        }}
                    />
                </div>
            </div>

            {/* Prix */}
            {showPrice && (
                <div
                    className={`absolute bottom-16 left-1/2 z-10 ${editing === 'price' ? 'cursor-text' : 'cursor-move'} select-none ${dragging === 'price' ? '' : 'transition-transform active:scale-95'}`}
                    style={{ transform: `translate(calc(-50% + ${positions.price.x}px), ${positions.price.y}px)`, touchAction: 'none' }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'price')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'price')}
                    onDoubleClick={() => isInteractive && setEditing('price')}
                    title="Double-clic pour éditer"
                >
                    <div className="flex items-center justify-center gap-3">
                        {showSolde && (
                            <div className="text-red-500 font-bold text-xl line-through drop-shadow-md flex items-baseline gap-1">
                                <span
                                    contentEditable={isInteractive && editing === 'price'}
                                    suppressContentEditableWarning
                                    onBlur={(e) => { handleTextChange('oldPrice', e.currentTarget.textContent || ''); setEditing(null) }}
                                    className={`outline-none ${editing === 'price' ? 'ring-2 ring-white/50 rounded px-0.5' : ''}`}
                                >
                                    {editableTexts.oldPrice}
                                </span>
                                <span className="text-sm">درهم</span>
                            </div>
                        )}
                        <div className={`${currentTheme.accent} font-black text-3xl drop-shadow-lg flex items-baseline gap-1`}>
                            <span
                                contentEditable={isInteractive && editing === 'price'}
                                suppressContentEditableWarning
                                onBlur={(e) => { handleTextChange('price', e.currentTarget.textContent || ''); setEditing(null) }}
                                className={`outline-none ${editing === 'price' ? 'ring-2 ring-white/50 rounded px-0.5' : ''}`}
                            >
                                {editableTexts.price}
                            </span>
                            <span className="text-xl">درهم</span>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp */}
            {showWhatsapp && (
                <div
                    className={`absolute bottom-4 right-4 z-10 ${editing === 'whatsapp' ? 'cursor-text' : 'cursor-move'} select-none transition-transform active:scale-95 origin-bottom-right`}
                    style={{ transform: `translate(${positions.whatsapp.x}px, ${positions.whatsapp.y}px) scale(${whatsappScale})`, touchAction: 'none' }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'whatsapp')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'whatsapp')}
                    onDoubleClick={() => isInteractive && setEditing('whatsapp')}
                    title="Double-clic pour éditer"
                >
                    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-full shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span
                            contentEditable={isInteractive && editing === 'whatsapp'}
                            suppressContentEditableWarning
                            onBlur={(e) => { handleTextChange('whatsapp', e.currentTarget.textContent || ''); setEditing(null) }}
                            className={`font-bold text-sm outline-none ${editing === 'whatsapp' ? 'ring-2 ring-white/50 rounded px-1' : ''}`}
                        >
                            {editableTexts.whatsapp}
                        </span>
                    </div>
                </div>
            )}

            {/* Social Icons */}
            {showSocials && (
                <div
                    className={`absolute bottom-4 left-4 z-10 ${editing === 'socials' ? 'cursor-text' : 'cursor-move'} select-none transition-transform active:scale-95 flex flex-col items-center gap-2 origin-bottom-left`}
                    style={{ transform: `translate(${positions.socials.x}px, ${positions.socials.y}px) scale(${socialsScale})`, touchAction: 'none' }}
                    onMouseDown={(e) => isInteractive && handleMouseDown(e, 'socials')}
                    onTouchStart={(e) => isInteractive && handleTouchStart(e, 'socials')}
                    onDoubleClick={() => isInteractive && setEditing('socials')}
                    title="Double-clic pour éditer"
                >
                    <span
                        contentEditable={isInteractive && editing === 'socials'}
                        suppressContentEditableWarning
                        onBlur={(e) => { handleTextChange('socialHandle', e.currentTarget.textContent || ''); setEditing(null) }}
                        className={`text-white font-bold text-sm tracking-wide outline-none ${editing === 'socials' ? 'ring-2 ring-white/50 rounded px-1' : ''}`}
                    >
                        {variant === 'jumia' ? '@jumia.ma' : editableTexts.socialHandle}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white">
                            <Instagram className="w-4 h-4" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                            <Facebook className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#E60023] flex items-center justify-center text-white border border-white/20">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.163 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.624 0 12.017 0z"/>
                            </svg>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white border border-white/20">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.44 3.29-1.43 4.54-1.03 1.3-2.58 2.16-4.25 2.38-1.74.22-3.56-.05-5.06-1.02-1.48-.96-2.54-2.5-2.85-4.23-.33-1.84.14-3.79 1.25-5.26 1.13-1.48 2.87-2.39 4.74-2.53V13c-.94.04-1.87.35-2.61.94-.74.57-1.18 1.44-1.28 2.37-.11 1.05.21 2.14.9 2.92.68.78 1.75 1.2 2.81 1.14 1.04-.06 2.02-.6 2.53-1.47.38-.66.56-1.42.56-2.18V.02z" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black backdrop-blur-md">
            <div className="bg-white w-full h-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
                {/* Left side: Preview Area */}
                <div className="flex-1 bg-gray-100 p-4 md:p-6 flex flex-col items-center overflow-auto">
                    {/* Top switcher: Les 2 images vs 1 image */}
                    <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-4 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-200/80 shadow-xs shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Affichage :</span>
                            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('both')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                        previewTab === 'both' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    Les 2 Images (Tekno Store + Jumia)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setPreviewTab('tekno'); setLogoVariant('tekno') }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                        previewTab === 'tekno' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    Image Tekno Store
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setPreviewTab('jumia'); setLogoVariant('jumia') }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                        previewTab === 'jumia' ? 'bg-[#F68B1E] text-white shadow-xs' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    Image Jumia
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadBoth}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-gradient-to-r from-black via-gray-900 to-[#F68B1E] text-white rounded-xl text-xs font-black hover:opacity-90 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                                title="Télécharger les 2 images en 1 clic"
                            >
                                <Download className="w-3.5 h-3.5 text-amber-300" />
                                {isGenerating ? 'Téléchargement...' : 'Télécharger les 2'}
                            </button>
                        </div>
                    </div>

                    {/* Mode "Les 2 Images" côte à côte */}
                    {previewTab === 'both' && (
                        <div className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-2 gap-6 items-start justify-items-center py-2">
                            {/* Card 1 : Image Tekno Store */}
                            <div className="flex flex-col items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-200/80 w-full max-w-[520px]">
                                <div className="flex items-center justify-between w-full mb-3 px-2">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-white flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        Image 1 : Tekno Store Store
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setFullscreenVariant('tekno')}
                                            className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                            title="Aperçu plein écran"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                                            Plein écran
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTekno Store}
                                            disabled={isGenerating}
                                            className="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Télécharger
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={(e) => handleCardClick('tekno', e)}
                                    title="Cliquer pour prévisualiser en plein écran"
                                >
                                    {renderPoster('tekno', posterRefTekno Store, true)}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-auto">
                                        <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                        <span>Plein écran</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2 : Image Jumia */}
                            <div className="flex flex-col items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-200/80 w-full max-w-[520px]">
                                <div className="flex items-center justify-between w-full mb-3 px-2">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F68B1E] text-white flex items-center gap-1.5 shadow-sm shadow-orange-500/20">
                                        <span className="w-2 h-2 rounded-full bg-white" />
                                        Image 2 : Jumia Maroc
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setFullscreenVariant('jumia')}
                                            className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                            title="Aperçu plein écran"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                                            Plein écran
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadJumia}
                                            disabled={isGenerating}
                                            className="px-3 py-1 text-xs font-bold text-[#F68B1E] hover:bg-orange-50 rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Télécharger
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={(e) => handleCardClick('jumia', e)}
                                    title="Cliquer pour prévisualiser en plein écran"
                                >
                                    {renderPoster('jumia', posterRefJumia, true)}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-auto">
                                        <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                        <span>Plein écran</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Image Tekno Store seule */}
                    {previewTab === 'tekno' && (
                        <div className="flex flex-col items-center bg-white p-5 rounded-3xl shadow-sm border border-gray-200/80">
                            <div className="flex items-center justify-between w-full mb-3 px-2">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                    Image Tekno Store Store
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFullscreenVariant('tekno')}
                                        className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Aperçu plein écran"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                                        Plein écran
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTekno Store}
                                        disabled={isGenerating}
                                        className="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Télécharger
                                    </button>
                                </div>
                            </div>
                            <div
                                className="relative group cursor-pointer"
                                onClick={(e) => handleCardClick('tekno', e)}
                                title="Cliquer pour prévisualiser en plein écran"
                            >
                                {renderPoster('tekno', posterRefTekno Store, true)}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-auto">
                                    <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Plein écran</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Image Jumia seule */}
                    {previewTab === 'jumia' && (
                        <div className="flex flex-col items-center bg-white p-5 rounded-3xl shadow-sm border border-gray-200/80">
                            <div className="flex items-center justify-between w-full mb-3 px-2">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F68B1E] text-white flex items-center gap-1.5 shadow-sm shadow-orange-500/20">
                                    <span className="w-2 h-2 rounded-full bg-white" />
                                    Image Jumia Maroc
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFullscreenVariant('jumia')}
                                        className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Aperçu plein écran"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                                        Plein écran
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadJumia}
                                        disabled={isGenerating}
                                        className="px-3 py-1 text-xs font-bold text-[#F68B1E] hover:bg-orange-50 rounded-lg transition-all flex items-center gap-1"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Télécharger
                                    </button>
                                </div>
                            </div>
                            <div
                                className="relative group cursor-pointer"
                                onClick={(e) => handleCardClick('jumia', e)}
                                title="Cliquer pour prévisualiser en plein écran"
                            >
                                {renderPoster('jumia', posterRefJumia, true)}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-auto">
                                    <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Plein écran</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Controls */}
                <div className="w-full md:w-[380px] bg-white border-l border-gray-200 p-8 flex flex-col relative shrink-0">
                    <button aria-label="Fermer"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <h3 className="text-lg font-bold text-gray-900 mb-6 mt-2 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-indigo-600" />
                        Créative Publicitaire
                    </h3>

                    <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Choisir un thème
                            </label>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gray-900 to-black mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Mode Sombre</span>
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-stone-50 to-stone-200 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Mode Clair</span>
                                </button>
                                <button
                                    onClick={() => setTheme('orange')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'orange' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-red-500 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Vibrant (Orange)</span>
                                </button>
                                <button
                                    onClick={() => setTheme('magenta')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'magenta' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-purple-600 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Magenta Pop</span>
                                </button>
                                <button
                                    onClick={() => setTheme('emerald')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'emerald' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-green-700 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Émeraude Nature</span>
                                </button>
                                <button
                                    onClick={() => setTheme('gold')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'gold' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-200 to-orange-500 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Gold Premium</span>
                                </button>
                                <button
                                    onClick={() => setTheme('purple')}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl border ${theme === 'purple' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-900 mr-3 border border-gray-300"></div>
                                    <span className="font-medium text-sm">Mystique Pourpre</span>
                                </button>
                            </div>
                        </div>

                        {/* Background Image Upload */}
                        <div className="pt-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                                Image de Fond (Perso)
                            </label>
                            <div className="space-y-3">
                                <label className="flex items-center justify-center gap-3 w-full px-4 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const reader = new FileReader()
                                                reader.onload = (ev) => setBgImage(ev.target?.result as string)
                                                reader.readAsDataURL(file)
                                            }
                                        }}
                                    />
                                    <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-600 group-hover:text-indigo-600">
                                        {bgImage ? 'Changer le fond' : 'Uploader un fond'}
                                    </span>
                                </label>
                                {bgImage && (
                                    <>
                                        <div className="pt-2">
                                            <label className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                <span>Opacité du fond</span>
                                                <span>{Math.round(bgOpacity * 100)}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0" max="1" step="0.05"
                                                value={bgOpacity}
                                                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setBgImage(null)}
                                            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition"
                                        >
                                            Réinitialiser le fond
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taille de l'image
                            </label>
                            <input
                                type="range"
                                min="0.5" max="2" step="0.05"
                                value={imageScale}
                                onChange={(e) => setImageScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rotation de l'image
                            </label>
                            <input
                                type="range"
                                min="-180" max="180" step="1"
                                value={imageRotation}
                                onChange={(e) => setImageRotation(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                <span>Opacité de l'image</span>
                                <span>{Math.round(imageOpacity * 100)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={imageOpacity}
                                onChange={(e) => setImageOpacity(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        {showLogo && (
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                    Logo du visuel
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogoVariant('tekno')
                                            setLogoScale(1)
                                            setPositions(p => ({ ...p, logo: { x: 0, y: 0 } }))
                                        }}
                                        className={`py-2 px-3 rounded-xl text-xs font-black tracking-wide border transition-all flex items-center justify-center gap-2 ${
                                            logoVariant === 'tekno'
                                                ? 'bg-black text-white border-black shadow-md'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${logoVariant === 'tekno' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                                        Tekno Store
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogoVariant('jumia')
                                            setLogoScale(1)
                                            setPositions(p => ({ ...p, logo: { x: 0, y: 0 } }))
                                        }}
                                        className={`py-2 px-3 rounded-xl text-xs font-black tracking-wide border transition-all flex items-center justify-center gap-2 ${
                                            logoVariant === 'jumia'
                                                ? 'bg-[#F68B1E] text-white border-[#F68B1E] shadow-md shadow-orange-500/20'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${logoVariant === 'jumia' ? 'bg-white' : 'bg-[#F68B1E]'}`} />
                                        Jumia
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                <span>Taille du logo</span>
                                <span>{Math.round(logoScale * 100)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0.5" max="2" step="0.05"
                                value={logoScale}
                                onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                                disabled={!showLogo}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taille du WhatsApp
                            </label>
                            <input
                                type="range"
                                min="0.5" max="2" step="0.1"
                                value={whatsappScale}
                                onChange={(e) => setWhatsappScale(parseFloat(e.target.value))}
                                disabled={!showWhatsapp}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taille des Réseaux Sociaux
                            </label>
                            <input
                                type="range"
                                min="0.5" max="2" step="0.1"
                                value={socialsScale}
                                onChange={(e) => setSocialsScale(parseFloat(e.target.value))}
                                disabled={!showSocials}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showLogo}
                                    onChange={(e) => setShowLogo(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Afficher le Logo</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showFreeDelivery}
                                    onChange={(e) => setShowFreeDelivery(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Livraison gratuite</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showShadow}
                                    onChange={(e) => setShowShadow(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Afficher l'ombre de l'image</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showPrice}
                                    onChange={(e) => setShowPrice(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Afficher le prix</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showSolde}
                                    onChange={(e) => setShowSolde(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Prix de Solde (Barré)</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showWhatsapp}
                                    onChange={(e) => setShowWhatsapp(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Afficher WhatsApp</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                <input
                                    type="checkbox"
                                    checked={showSocials}
                                    onChange={(e) => setShowSocials(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-800">Afficher Réseaux Sociaux</span>
                            </label>
                        </div>

                        <div className="bg-indigo-50 text-indigo-800 text-xs p-4 rounded-xl space-y-2">
                            <p>💡 <strong>Astuce :</strong> Vous pouvez <strong>glisser-déposer</strong> les éléments et <strong>cliquer sur les textes</strong> pour les modifier !</p>
                            <p>📏 Format optimisé ({format === 'story' ? '9:16' : '1:1 carré'}) pour {format === 'story' ? 'les stories' : 'les publications'}.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Publication n8n</h4>
                            <button
                                onClick={() => setShowPublishOptions(!showPublishOptions)}
                                className="text-indigo-600 text-xs font-bold hover:underline"
                            >
                                {showPublishOptions ? 'Masquer options' : 'Options avancées'}
                            </button>
                        </div>

                        {showPublishOptions && (
                            <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                {/* Platform Selection */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Plateforme</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'facebook', label: 'FB', icon: 'FB' },
                                            { id: 'instagram', label: 'IG', icon: 'IG' },
                                            { id: 'tiktok', label: 'TK', icon: 'TK' },
                                            { id: 'threads', label: 'TH', icon: 'TH' },
                                            { id: 'pinterest', label: 'PI', icon: 'PI' },
                                            { id: 'all', label: 'All', icon: '🚀' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPlatform(p.id as any)}
                                                className={`py-2 rounded-lg text-xs font-bold border transition ${platform === p.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description Selection */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setUseDescription('short')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${useDescription === 'short' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                                        >
                                            Courte
                                        </button>
                                        <button
                                            onClick={() => setUseDescription('long')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${useDescription === 'long' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                                        >
                                            Longue
                                        </button>
                                    </div>
                                </div>

                                {/* Scheduling */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Programmer</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleAt}
                                        onChange={(e) => setScheduleAt(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                {/* Caption Editor */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Texte du Post (Caption)</label>
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        rows={5}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium"
                                        placeholder="Écrivez la légende du post ici..."
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1 italic">Ce texte sera utilisé pour la publication et l'aperçu.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleDownloadBoth}
                                disabled={isGenerating}
                                className="col-span-2 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-black via-gray-900 to-[#F68B1E] text-white font-black rounded-xl hover:opacity-95 transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider gap-2 disabled:opacity-70"
                                title="Télécharger les 2 images : 1 avec logo Tekno Store et 1 avec logo Jumia"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                {isGenerating ? 'Génération en cours...' : 'Télécharger les 2 (Tekno Store + Jumia)'}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="flex items-center justify-center px-3 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-lg active:scale-95 text-xs"
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                {isGenerating ? '...' : `Télécharger (${logoVariant === 'jumia' ? 'Jumia' : 'Tekno Store'})`}
                            </button>
                            <button
                                onClick={handlePreview}
                                disabled={isGenerating}
                                className="flex items-center justify-center px-3 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-70 shadow-lg active:scale-95 text-xs"
                            >
                                <Eye className="w-4 h-4 mr-1.5" />
                                Visualiser
                            </button>
                            <button
                                onClick={async () => {
                                    if (!posterRef.current || !book) return
                                    try {
                                        setIsGenerating(true)
                                        const originals = await patchImagesBase64(posterRef.current)
                                        await new Promise(resolve => setTimeout(resolve, 800))
                                        const dataUrl = await htmlToImage.toPng(posterRef.current, {
                                            quality: 1,
                                            pixelRatio: 2,
                                            backgroundColor: 'transparent',
                                            cacheBust: false,
                                        })
                                        restoreImages(originals)

                                        const arr = dataUrl.split(',')
                                        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
                                        const bstr = atob(arr[1])
                                        let n = bstr.length
                                        const u8arr = new Uint8Array(n)
                                        while (n--) u8arr[n] = bstr.charCodeAt(n)
                                        const blob = new Blob([u8arr], { type: mime })
                                        const filename = `${book.title.replace(/[\/\\?%*:|"<>]/g, '-')}_${Date.now()}.png`
                                        const file = new File([blob], filename, { type: mime })

                                        const formData = new FormData()
                                        formData.append('file', file)
                                        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                                        const uploadData = await uploadRes.json()

                                        if (uploadData.success) {
                                            const assetRes = await fetch('/api/admin/marketing/assets', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    name: uploadData.url.split('/').pop(),
                                                    url: uploadData.url,
                                                    type: 'CREATIVE',
                                                    bookId: book.id
                                                })
                                            })
                                            const assetData = await assetRes.json()
                                            if (assetData.success) {
                                                alert('✅ Image sauvegardée dans le hub marketing')
                                            } else {
                                                throw new Error(assetData.error || 'Erreur lors de l\'enregistrement en base')
                                            }
                                        } else {
                                            throw new Error(uploadData.error || 'Échec de l\'upload')
                                        }
                                    } catch (error: any) {
                                        console.error('Save error:', error)
                                        alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`)
                                    } finally {
                                        setIsGenerating(false)
                                    }
                                }}
                                disabled={isGenerating}
                                className="col-span-2 flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                                {isGenerating ? 'Génération...' : 'Sauvegarder dans Marketing'}
                            </button>
                        </div>

                        <button
                            onClick={handleQuickPublish}
                            disabled={isGenerating || isPublishing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white font-bold text-xs rounded-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                            {isPublishing ? 'Publication...' : scheduleAt ? `Programmer pour ${new Date(scheduleAt).toLocaleDateString()}` : 'Publier via n8n (Image en cours)'}
                        </button>
                    </div>
                </div>

            </div>

            {/* Modal de prévisualisation plein écran */}
            {fullscreenVariant && (
                <div
                    className="fixed inset-0 z-[600] flex flex-col items-center justify-between bg-black/92 backdrop-blur-lg p-4 md:p-6 animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setFullscreenVariant(null)
                    }}
                >
                    {/* Top Control Bar */}
                    <div className="w-full max-w-5xl flex items-center justify-between px-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-md ${fullscreenVariant === 'jumia' ? 'bg-[#F68B1E]' : 'bg-black border border-white/20'}`}>
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                {fullscreenVariant === 'jumia' ? 'Image Jumia Maroc' : 'Image Tekno Store Store'}
                            </span>
                            {/* Basculeur direct Tekno Store / Jumia */}
                            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setFullscreenVariant('tekno')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${fullscreenVariant === 'tekno' ? 'bg-white text-black shadow' : 'text-white/80 hover:text-white'}`}
                                >
                                    Tekno Store
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFullscreenVariant('jumia')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${fullscreenVariant === 'jumia' ? 'bg-[#F68B1E] text-white shadow' : 'text-white/80 hover:text-white'}`}
                                >
                                    Jumia
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (fullscreenVariant === 'tekno') handleDownloadTekno Store()
                                    else handleDownloadJumia()
                                }}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-indigo-600" />
                                Télécharger cette créative
                            </button>
                            <button
                                type="button"
                                onClick={() => setFullscreenVariant(null)}
                                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                                title="Fermer (Échap)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Poster en plein écran */}
                    <div
                        className="flex-1 flex items-center justify-center w-full max-h-[82vh] my-auto py-2 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="transition-transform drop-shadow-2xl">
                            {renderPoster(
                                fullscreenVariant,
                                null,
                                false,
                                format === 'story'
                                    ? 'w-[420px] min-h-[746px] max-w-[90vw] max-h-[78vh]'
                                    : 'w-[560px] h-[560px] max-w-[85vw] max-h-[78vh]'
                            )}
                        </div>
                    </div>

                    {/* Footer helper */}
                    <div className="shrink-0 text-xs text-white/60 flex items-center gap-2 pt-2">
                        <span>Cliquez en dehors ou appuyez sur</span>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/20">Échap</kbd>
                        <span>pour fermer</span>
                    </div>
                </div>
            )}
        </div>
    )
}
