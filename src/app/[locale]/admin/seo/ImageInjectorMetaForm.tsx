'use client'

import { useState } from 'react'
import { Image as ImageIcon, Search, CheckCircle2, AlertCircle, Loader2, Tag, Download } from 'lucide-react'

interface Book {
    id: string
    title: string
    author: string
    image: string
    altText?: string
    imageTitle?: string
    imageKeywords?: string
    category?: string
    language?: string
}

interface ImageInjectorMetaFormProps {
    books: Book[]
}

export default function ImageInjectorMetaForm({ books }: ImageInjectorMetaFormProps) {
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState<string | null>(null)
    const [saved, setSaved] = useState<Set<string>>(new Set())

    // New state for EXIF
    const [injectingExif, setInjectingExif] = useState<string | null>(null)
    const [exifSuccess, setExifSuccess] = useState<Set<string>>(new Set())

    // New state for Renaming
    const [renaming, setRenaming] = useState<string | null>(null)
    const [renameSuccess, setRenameSuccess] = useState<Set<string>>(new Set())

    // New state for Downloading
    const [isDownloading, setIsDownloading] = useState(false)

    // New state for WEBP Compression
    const [compressing, setCompressing] = useState<string | null>(null)
    const [compressSuccess, setCompressSuccess] = useState<Set<string>>(new Set())

    // Progress bar
    const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null)

    const [edits, setEdits] = useState<Record<string, { alt: string; title: string; keywords: string }>>(
        Object.fromEntries(books.map(b => [b.id, {
            alt: b.altText || `${b.title} - ${b.author} | Tekno Store`,
            title: b.imageTitle || `Acheter ${b.title} de ${b.author} sur Tekno Store`,
            keywords: b.imageKeywords || `${b.title}, ${b.author}, livre, tekno, acheter livre maroc${b.category ? `, ${b.category}` : ''}`
        }]))
    )
    const [message, setMessage] = useState('')

    const filtered = books.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    )

    async function saveBook(bookId: string) {
        setSaving(bookId)
        try {
            const res = await fetch(`/api/admin/books/${bookId}/image-seo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edits[bookId])
            })
            if (res.ok) {
                setSaved(prev => new Set([...prev, bookId]))
                setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(bookId); return n }), 2000)
            }
        } catch (e) {
            setMessage('Erreur lors de la sauvegarde.')
        } finally {
            setSaving(null)
        }
    }

    async function saveAll() {
        setSaving('all')
        setMessage('')
        const entries = Object.entries(edits)
        setProgress({ current: 0, total: entries.length, label: 'Sauvegarde des métadonnées...' })
        try {
            const chunkSize = 50
            let totalSaved = 0
            let errorCount = 0

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + chunkSize))
                const res = await fetch('/api/admin/books/image-seo-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ edits: chunk })
                })

                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    errorCount += Object.keys(chunk).length
                    console.error(`Erreur serveur chunk sauvegarde: La réponse n'est pas au format JSON`)
                    continue
                }

                const data = await res.json()
                if (res.ok && data.success) {
                    totalSaved += data.count || Object.keys(chunk).length
                } else {
                    errorCount += Object.keys(chunk).length
                    console.error(`Erreur chunk de sauvegarde:`, data.error || res.statusText)
                }
                setProgress({ current: Math.min(i + chunkSize, entries.length), total: entries.length, label: 'Sauvegarde des métadonnées...' })
            }
            if (errorCount > 0) {
                setMessage(`${totalSaved} métadonnées d'images ont été enregistrées ! (${errorCount} erreurs, voir console)`)
            } else {
                setMessage(`${totalSaved} métadonnées d'images ont été enregistrées !`)
            }
        } catch (e: any) {
            setMessage('Erreur de requête: ' + e.message)
        } finally {
            setSaving(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function injectExif(bookId: string) {
        setInjectingExif(bookId)
        try {
            const res = await fetch(`/api/admin/books/${bookId}/exif-inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: edits[bookId].title,
                    keywords: edits[bookId].keywords
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setExifSuccess(prev => new Set([...prev, bookId]))
                setTimeout(() => setExifSuccess(prev => { const n = new Set(prev); n.delete(bookId); return n }), 3000)
            } else {
                alert(data.error || 'Erreur lors de l\'injection EXIF')
            }
        } catch (e) {
            alert('Erreur réseau lors de l\'injection EXIF.')
        } finally {
            setInjectingExif(null)
        }
    }

    async function renameImage(bookId: string) {
        setRenaming(bookId)
        setMessage('')
        try {
            const res = await fetch(`/api/admin/books/${bookId}/rename-image`, { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.success) {
                setRenameSuccess(prev => new Set([...prev, bookId]))
            } else {
                setMessage('Erreur: ' + (data.error || 'Impossible de renommer'))
            }
        } catch (e) {
            setMessage('Erreur réseau lors du renommage.')
        } finally {
            setRenaming(null)
        }
    }

    async function renameAll() {
        setRenaming('all')
        setMessage('')
        let successCount = 0
        let errorCount = 0
        setProgress({ current: 0, total: filtered.length, label: 'Renommage des images...' })
        try {
            for (let i = 0; i < filtered.length; i++) {
                const book = filtered[i]
                const res = await fetch(`/api/admin/books/${book.id}/rename-image`, { method: 'POST' })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success) {
                        successCount++
                        setRenameSuccess(prev => new Set([...prev, book.id]))
                    }
                } else {
                    errorCount++
                    const errorData = await res.json().catch(() => null)
                    const errorMsg = errorData ? (errorData.error || JSON.stringify(errorData)) : res.statusText;
                    console.error(`Erreur pour le livre ${book.id} (${book.title}):`, errorMsg)
                }
                setProgress({ current: i + 1, total: filtered.length, label: 'Renommage des images...' })
            }
            if (errorCount > 0) {
                setMessage(`${successCount} images renommées avec succès ! (${errorCount} erreurs, vérifiez la console F12)`)
            } else {
                setMessage(`${successCount} images renommées avec succès !`)
            }
        } catch (e) {
            setMessage('Erreur réseau lors du renommage global.')
        } finally {
            setRenaming(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function compressWebp(bookId: string) {
        setCompressing(bookId)
        setMessage('')
        try {
            const res = await fetch(`/api/admin/books/${bookId}/compress-webp`, { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.success) {
                setCompressSuccess(prev => new Set([...prev, bookId]))
                setTimeout(() => setCompressSuccess(prev => { const n = new Set(prev); n.delete(bookId); return n }), 3000)
            } else {
                setMessage('Erreur: ' + (data.error || 'Impossible de compresser'))
            }
        } catch (e) {
            setMessage('Erreur réseau lors de la compression.')
        } finally {
            setCompressing(null)
        }
    }

    async function compressAllWebp() {
        setCompressing('all')
        setMessage('')
        let successCount = 0
        let errorCount = 0
        setProgress({ current: 0, total: filtered.length, label: 'Compression WEBP des images...' })
        try {
            for (let i = 0; i < filtered.length; i++) {
                const book = filtered[i]
                if (book.image?.toLowerCase().endsWith('.webp')) {
                    setProgress({ current: i + 1, total: filtered.length, label: 'Compression WEBP des images...' })
                    continue
                }
                const res = await fetch(`/api/admin/books/${book.id}/compress-webp`, { method: 'POST' })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success) {
                        successCount++
                        setCompressSuccess(prev => new Set([...prev, book.id]))
                    }
                } else {
                    errorCount++
                }
                setProgress({ current: i + 1, total: filtered.length, label: 'Compression WEBP des images...' })
            }
            if (errorCount > 0) {
                setMessage(`${successCount} images compressées en WEBP ! (${errorCount} erreurs)`)
            } else {
                setMessage(`${successCount} images compressées en WEBP !`)
            }
        } catch (e) {
            setMessage('Erreur réseau lors de la compression globale.')
        } finally {
            setCompressing(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function injectExifAll() {
        setInjectingExif('all')
        setMessage('')
        setProgress({ current: 0, total: filtered.length, label: 'Injection des métadonnées EXIF...' })
        let successCount = 0
        let errorCount = 0
        try {
            // Traitement 1 par 1 pour éviter le timeout 504
            for (let i = 0; i < filtered.length; i++) {
                const book = filtered[i]
                const edit = edits[book.id]
                if (!edit) {
                    setProgress({ current: i + 1, total: filtered.length, label: 'Injection des métadonnées EXIF...' })
                    continue
                }
                try {
                    const res = await fetch(`/api/admin/books/${book.id}/exif-inject`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: edit.title, keywords: edit.keywords })
                    })
                    const contentType = res.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json()
                        if (res.ok && data.success) {
                            successCount++
                            setExifSuccess(prev => new Set([...prev, book.id]))
                        } else {
                            errorCount++
                            console.error(`Erreur EXIF ${book.title}:`, data.error || res.statusText)
                        }
                    } else {
                        errorCount++
                        console.error(`Erreur EXIF ${book.title}: réponse non-JSON (${res.status})`)
                    }
                } catch (e) {
                    errorCount++
                    console.error(`Erreur réseau EXIF ${book.title}:`, e)
                }
                setProgress({ current: i + 1, total: filtered.length, label: 'Injection des métadonnées EXIF...' })
            }
            if (errorCount > 0) {
                setMessage(`L'injection EXIF a été effectuée sur ${successCount} images ! (${errorCount} erreurs, vérifiez la console)`)
            } else {
                setMessage(`L'injection EXIF a été effectuée sur ${successCount} images !`)
            }
        } catch (e: any) {
            setMessage('Erreur réseau lors de l\'injection EXIF globale: ' + e.message)
        } finally {
            setInjectingExif(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function downloadAll() {
        if (!confirm(`Voulez-vous vraiment télécharger ${filtered.length} images ? Votre navigateur pourrait vous demander l'autorisation de télécharger plusieurs fichiers.`)) return;

        setIsDownloading(true);
        setMessage('');
        setProgress({ current: 0, total: filtered.length, label: 'Téléchargement en cours...' });

        let errorCount = 0;

        for (let i = 0; i < filtered.length; i++) {
            const book = filtered[i];
            try {
                const res = await fetch(book.image);
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                let filename = book.image.split('/').pop() || `${book.id}.jpg`;
                if (filename.includes('?')) filename = filename.split('?')[0];
                a.download = filename;

                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (e) {
                errorCount++;
                console.error(`Erreur téléchargement ${book.image}`, e);
            }
            setProgress({ current: i + 1, total: filtered.length, label: 'Téléchargement en cours...' });

            // Attendre 250ms pour ne pas bloquer le navigateur
            await new Promise(r => setTimeout(r, 250));
        }

        setTimeout(() => setProgress(null), 2000);
        if (errorCount > 0) {
            setMessage(`Téléchargement terminé : ${filtered.length - errorCount} succès, ${errorCount} erreurs.`);
        } else {
            setMessage(`Téléchargement terminé : ${filtered.length} images téléchargées !`);
        }
        setIsDownloading(false);
    }

    function autoGenerateAll() {
        const updated: Record<string, { alt: string; title: string; keywords: string }> = {}

        // Mots-clés FR — longue traîne géolocalisée pour battre Mylibrairie / LivreMoi / DSM
        const frKeywords = "librairie en ligne maroc, librairie livraison maroc, acheter livre maroc, acheter livres en ligne maroc, livres en ligne maroc, commander livre en ligne maroc, livraison livres maroc, livraison livre à domicile maroc, livraison rapide livre maroc, livres pas cher maroc, livres moins cher maroc, meilleur prix livre maroc, librairie en ligne rabat, librairie en ligne casablanca, librairie en ligne tanger, librairie en ligne marrakech, librairie en ligne agadir, librairie en ligne fes, livres livraison casablanca, livres livraison rabat, livres livraison tanger, acheter roman maroc, roman pas cher maroc, roman en ligne maroc, romans français maroc, romans arabes maroc, romans policiers maroc, romans historiques maroc, romans d'amour maroc, best-sellers maroc, nouveautés livres maroc, livres développement personnel maroc, livres motivation maroc, livres psychologie maroc, livres business maroc, livres entrepreneuriat maroc, livres confiance en soi, livres bien-être maroc, livres enfants maroc, livres scolaires maroc, livres jeunesse maroc, livres manga maroc, pack livres maroc, pack romans maroc, coffret livres maroc, tekno librairie maroc, tekno livres, librairie tekno, acheter livre paiement à la livraison maroc, livre cod maroc, livre cash on delivery maroc, vente livre en ligne maroc, boutique livre maroc, site livre maroc";

        // Mots-clés AR — géolocalisés Maroc
        const arKeywords = "مكتبة إلكترونية المغرب, شراء الكتب أونلاين المغرب, شراء كتب عبر الإنترنت المغرب, توصيل الكتب المغرب, توصيل كتب للمنزل المغرب, كتب بأرخص الأسعار المغرب, أفضل مكتبة إلكترونية مغربية, شراء روايات المغرب, روايات عربية للبيع المغرب, روايات عالمية للبيع المغرب, كتب التنمية الذاتية المغرب, كتب تطوير الذات, كتب علم النفس, كتب الأعمال والريادة, كتب التحفيز والإنتاجية, كتب للأطفال المغرب, كتب مدرسية المغرب, مكتبة Tekno Store المغرب, شراء كتب بالدفع عند التسليم, كتب كاش أون ديليفري المغرب, أفضل الكتب المغرب, كتب للبيع بالمغرب, توصيل سريع للكتب المغرب, طلب كتب أونلاين المغرب, موقع بيع الكتب المغرب";

        // Mots-clés EN — Morocco English book buyers
        const enKeywords = "online bookstore Morocco, buy books online Morocco, book delivery Morocco, books delivered to your door Morocco, cheap books Morocco, best price books Morocco, fast book delivery Morocco, online library Morocco, bookshop Morocco, buy novels Morocco, fiction books Morocco, self help books Morocco, personal development books Morocco, business books Morocco, children books Morocco, school books Morocco, English books Morocco, French books Morocco, Arabic books Morocco, book store Casablanca, book store Rabat, book store Tangier, best books Morocco, new releases books Morocco, tekno bookstore, tekno books Morocco, book cash on delivery Morocco, COD books Morocco, order books online Morocco";

        books.forEach(b => {
            let baseKeywords = "";
            if (b.language === 'ar') baseKeywords = arKeywords;
            else if (b.language === 'en') baseKeywords = enKeywords;
            else baseKeywords = frKeywords;

            updated[b.id] = {
                alt: `${b.title} - ${b.author}${b.category ? ` | ${b.category}` : ''} | Librairie Tekno Store Maroc`,
                title: `Acheter "${b.title}" de ${b.author} - Livraison rapide au Maroc | Tekno Store`,
                keywords: `${b.title}, ${b.author}, livre, tekno${b.category ? `, ${b.category}` : ''}, ${baseKeywords}`
            }
        })
        setEdits(updated)
    }


    return (
        <div className="space-y-6">
            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-blue-800 mb-1">Injection de métadonnées SEO dans les images</p>
                    <p className="text-xs text-blue-700">
                        Le texte <strong>Alt</strong> et le <strong>Title</strong> des images sont indexés par Google Images.
                        Un bon alt text augmente le trafic organique provenant de la recherche d'images.<br />
                        Vous pouvez également <strong>injecter les métadonnées EXIF (Titre et Mots clés)</strong> directement dans le fichier image pour qu'elles s'affichent dans les propriétés Windows.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message.includes('effectuée') || message.includes('enregistrées') || message.includes('succès') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.includes('effectuée') || message.includes('enregistrées') || message.includes('succès') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message}
                </div>
            )}

            {/* Barre de progression globale */}
            {progress && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            {progress.label}
                        </span>
                        <span className="text-xs font-black text-blue-600">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-2 text-right">{progress.current} / {progress.total} traités</p>
                </div>
            )}

            {/* Actions globales */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un livre..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={autoGenerateAll}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-sm font-bold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    <Tag className="w-4 h-4" />
                    Auto-générer tout
                </button>
                <button
                    type="button"
                    onClick={saveAll}
                    disabled={saving === 'all'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {saving === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Sauvegarder tout
                </button>
                <button
                    type="button"
                    onClick={injectExifAll}
                    disabled={injectingExif === 'all'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {injectingExif === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Injecter EXIF tout
                </button>
                <button
                    type="button"
                    onClick={renameAll}
                    disabled={renaming === 'all'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                    {renaming === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Renommer tout
                </button>
                <button
                    type="button"
                    onClick={downloadAll}
                    disabled={isDownloading || filtered.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Télécharger tout
                </button>
                <button
                    type="button"
                    onClick={compressAllWebp}
                    disabled={compressing === 'all' || filtered.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {compressing === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Compresser TOUT (WEBP)
                </button>
            </div>

            {/* Liste des livres */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filtered.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8 col-span-full">Aucun livre trouvé.</p>
                )}
                {filtered.map(book => (
                    <div key={book.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors flex flex-col h-full">
                        <div className="flex gap-4 items-start">
                            {/* Image */}
                            <a href={`/fr/admin/products/${book.id}/edit`} target="_blank" title="Éditer ce produit" className="block w-16 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
                                <img
                                    src={book.image?.startsWith('/') && process.env.NODE_ENV === 'development' ? `https://tekno.ma${book.image}` : book.image}
                                    alt={edits[book.id]?.alt || book.title}
                                    title={edits[book.id]?.title || book.title}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                                />
                            </a>

                            {/* Fields */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <a href={`/fr/admin/products/${book.id}/edit`} className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-widest mb-0.5 inline-block" title="Éditer ce produit" target="_blank">{book.title}</a>
                                    <p className="text-xs text-gray-400">{book.author}</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Alt Text (indexé par Google Images)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[book.id]?.alt || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [book.id]: { ...prev[book.id], alt: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        placeholder={`${book.title} - ${book.author} | Tekno Store`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Title (tooltip + SEO)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[book.id]?.title || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [book.id]: { ...prev[book.id], title: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        placeholder={`Acheter ${book.title} | Tekno Store`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Mots clés EXIF (séparés par virgule)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[book.id]?.keywords || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [book.id]: { ...prev[book.id], keywords: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        placeholder={`Livre, Tekno Store, ...`}
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Save individual (Actions at the bottom) */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                            <button
                                type="button"
                                onClick={() => saveBook(book.id)}
                                disabled={saving === book.id}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {saving === book.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : saved.has(book.id) ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                )}
                                {saved.has(book.id) ? 'Sauvé' : 'Sauver SEO'}
                            </button>

                            <button
                                type="button"
                                onClick={() => injectExif(book.id)}
                                disabled={injectingExif === book.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${exifSuccess.has(book.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'} disabled:opacity-50`}
                            >
                                {injectingExif === book.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : exifSuccess.has(book.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {exifSuccess.has(book.id) ? 'Injecté !' : 'EXIF'}
                            </button>

                            <button
                                type="button"
                                onClick={() => renameImage(book.id)}
                                disabled={renaming === book.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${renameSuccess.has(book.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'} disabled:opacity-50`}
                            >
                                {renaming === book.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : renameSuccess.has(book.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <ImageIcon className="w-3 h-3" />
                                )}
                                {renameSuccess.has(book.id) ? 'Renommé !' : 'Renommer'}
                            </button>

                            <button
                                type="button"
                                onClick={() => compressWebp(book.id)}
                                disabled={compressing === book.id || book.image?.toLowerCase().endsWith('.webp')}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${compressSuccess.has(book.id) || book.image?.toLowerCase().endsWith('.webp') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'} disabled:opacity-50`}
                            >
                                {compressing === book.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : compressSuccess.has(book.id) || book.image?.toLowerCase().endsWith('.webp') ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <ImageIcon className="w-3 h-3" />
                                )}
                                {book.image?.toLowerCase().endsWith('.webp') ? 'WEBP OK' : compressSuccess.has(book.id) ? 'Compressé' : 'To WEBP'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
