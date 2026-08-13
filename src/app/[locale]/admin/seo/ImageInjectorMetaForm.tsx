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

    // Progress bar
    const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null)

    const [edits, setEdits] = useState<Record<string, { alt: string; title: string; keywords: string }>>(
        Object.fromEntries(books.map(b => [b.id, {
            alt: b.altText || `${b.title} - ${b.author} | Riwaya`,
            title: b.imageTitle || `Acheter ${b.title} de ${b.author} sur Riwaya`,
            keywords: b.imageKeywords || `${b.title}, ${b.author}, livre, riwaya, acheter livre maroc${b.category ? `, ${b.category}` : ''}`
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

    async function injectExifAll() {
        setInjectingExif('all')
        setMessage('')
        const entries = Object.entries(edits)
        setProgress({ current: 0, total: entries.length, label: 'Injection des métadonnées EXIF...' })
        try {
            const chunkSize = 50
            let totalInjected = 0
            let errorCount = 0

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + chunkSize))
                const res = await fetch('/api/admin/books/exif-inject-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ edits: chunk })
                })
                
                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Erreur serveur (${res.status}): La réponse n'est pas au format JSON. (Charge utile trop volumineuse ?)`)
                }

                const data = await res.json()
                if (res.ok && data.success) {
                    totalInjected += data.count || Object.keys(chunk).length
                } else {
                    errorCount += Object.keys(chunk).length
                    console.error(`Erreur chunk d'injection:`, data.error || res.statusText)
                }
                setProgress({ current: Math.min(i + chunkSize, entries.length), total: entries.length, label: 'Injection des métadonnées EXIF...' })
            }
            if (errorCount > 0) {
                setMessage(`L'injection EXIF a été effectuée sur ${totalInjected} images ! (${errorCount} erreurs, vérifiez la console)`)
            } else {
                setMessage(`L'injection EXIF a été effectuée sur ${totalInjected} images !`)
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
        
        const frKeywords = "librairie en ligne maroc, acheter livres en ligne maroc, livres en ligne maroc, acheter livre maroc, vente de livres en ligne, librairie en ligne rabat, librairie en ligne casablanca, librairie en ligne maroc pas cher, livres pas cher maroc, commander livre en ligne maroc, livraison livres maroc, livres avec livraison gratuite maroc, romans en ligne maroc, acheter romans maroc, romans pas cher maroc, romans français maroc, romans arabes maroc, romans policiers maroc, romans d'amour maroc, romans historiques maroc, livres développement personnel maroc, acheter livres développement personnel, livres motivation maroc, livres psychologie maroc, livres business maroc, livres entrepreneuriat maroc, livres productivité, livres confiance en soi, acheter livre en ligne, commander livre en ligne, acheter roman en ligne, acheter livres pas cher, livre prix maroc, roman prix maroc, pack livres maroc, pack romans maroc, livres livraison gratuite, librairie livraison maroc";
        const arKeywords = "مكتبة إلكترونية المغرب, شراء الكتب أونلاين المغرب, شراء الكتب عبر الإنترنت المغرب, شراء روايات المغرب, كتب وروايات المغرب, أفضل الكتب, أفضل الروايات, روايات عربية, روايات عالمية, كتب التنمية الذاتية, كتب تطوير الذات, كتب علم النفس, كتب الأعمال, كتب ريادة الأعمال, كتب التحفيز, كتب الإنتاجية, كتب الثقة بالنفس, كتب ورقية المغرب, شراء كتب أونلاين, توصيل الكتب في المغرب, توصيل الكتب مجانا, مكتبة إلكترونية مغربية, روايات للبيع المغرب, كتب للبيع المغرب";
        const enKeywords = "online bookstore Morocco, online bookshop Morocco, buy books online Morocco, books online Morocco, buy books Morocco, books for sale Morocco, cheap books Morocco, affordable books Morocco, online library Morocco, book delivery Morocco, free book delivery Morocco, buy novels online Morocco, novels Morocco, fiction books Morocco, Arabic books Morocco, French books Morocco, self development books Morocco, personal development books Morocco, psychology books Morocco, business books Morocco, entrepreneurship books Morocco, productivity books, motivational books, best books to read, book store Morocco";

        books.forEach(b => {
            let baseKeywords = "";
            if (b.language === 'ar') baseKeywords = arKeywords;
            else if (b.language === 'en') baseKeywords = enKeywords;
            else baseKeywords = frKeywords; // Default to French if 'fr' or undefined

            updated[b.id] = {
                alt: `${b.title} - ${b.author}${b.category ? ` | ${b.category}` : ''} | Librairie Riwaya Maroc`,
                title: `Acheter "${b.title}" de ${b.author} - Livraison rapide au Maroc | Riwaya`,
                keywords: `${b.title}, ${b.author}, livre, riwaya, acheter livre maroc${b.category ? `, ${b.category}` : ''}, ${baseKeywords}`
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
                            <a href={`/fr/admin/books/${book.id}/edit`} target="_blank" title="Éditer ce produit" className="block w-16 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
                                <img
                                    src={book.image}
                                    alt={edits[book.id]?.alt || book.title}
                                    title={edits[book.id]?.title || book.title}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                                />
                            </a>

                            {/* Fields */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <a href={`/fr/admin/books/${book.id}/edit`} className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-widest mb-0.5 inline-block" title="Éditer ce produit" target="_blank">{book.title}</a>
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
                                        placeholder={`${book.title} - ${book.author} | Riwaya`}
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
                                        placeholder={`Acheter ${book.title} | Riwaya`}
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
                                        placeholder={`Livre, Riwaya, ...`}
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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
