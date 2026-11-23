'use client'

import { useState } from 'react'
import { Image as ImageIcon, Search, CheckCircle2, AlertCircle, Loader2, Tag, Download } from 'lucide-react'

interface Asset {
    id: string
    name: string
    url: string
    type: string
    altText?: string
    imageTitle?: string
}

interface MarketingImageInjectorMetaFormProps {
    assets: Asset[]
}

export default function MarketingImageInjectorMetaForm({ assets }: MarketingImageInjectorMetaFormProps) {
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState<string | null>(null)
    const [saved, setSaved] = useState<Set<string>>(new Set())

    // New state for EXIF
    const [injectingExif, setInjectingExif] = useState<string | null>(null)
    const [exifSuccess, setExifSuccess] = useState<Set<string>>(new Set())

    // New state for Renaming
    const [renaming, setRenaming] = useState<string | null>(null)
    const [renameSuccess, setRenameSuccess] = useState<Set<string>>(new Set())

    const [isDownloading, setIsDownloading] = useState(false)
    const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null)

    // New state for WEBP Compression
    const [compressing, setCompressing] = useState<string | null>(null)
    const [compressSuccess, setCompressSuccess] = useState<Set<string>>(new Set())

    const [edits, setEdits] = useState<Record<string, { alt: string; title: string; keywords: string }>>(
        Object.fromEntries(assets.map(a => [a.id, {
            alt: a.altText || `${a.name} | Tekno Store Promotion`,
            title: a.imageTitle || `Offre spéciale ${a.name} sur Tekno Store`,
            keywords: `${a.name}, marketing, promotion, offre, tekno, livre`
        }]))
    )
    const [message, setMessage] = useState('')

    const filtered = assets.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.type?.toLowerCase().includes(search.toLowerCase())
    )

    async function saveAsset(assetId: string) {
        setSaving(assetId)
        try {
            const res = await fetch(`/api/admin/marketing-assets/${assetId}/image-seo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edits[assetId])
            })
            if (res.ok) {
                setSaved(prev => new Set([...prev, assetId]))
                setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(assetId); return n }), 2000)
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

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + chunkSize))
                const res = await fetch('/api/admin/marketing-assets/image-seo-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ edits: chunk })
                })

                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Erreur serveur (${res.status}): Réponse non JSON.`)
                }

                if (!res.ok) throw new Error('Erreur API')
                setProgress({ current: Math.min(i + chunkSize, entries.length), total: entries.length, label: 'Sauvegarde des métadonnées...' })
            }
            setMessage('Toutes les métadonnées des images marketing ont été enregistrées !')
        } catch (e: any) {
            setMessage('Erreur lors de la sauvegarde: ' + e.message)
        } finally {
            setSaving(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function injectExif(assetId: string) {
        setInjectingExif(assetId)
        try {
            const res = await fetch(`/api/admin/marketing-assets/${assetId}/exif-inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: edits[assetId].title,
                    keywords: edits[assetId].keywords
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setExifSuccess(prev => new Set([...prev, assetId]))
                setTimeout(() => setExifSuccess(prev => { const n = new Set(prev); n.delete(assetId); return n }), 3000)
            } else {
                alert(data.error || 'Erreur lors de l\'injection EXIF')
            }
        } catch (e) {
            alert('Erreur réseau lors de l\'injection EXIF.')
        } finally {
            setInjectingExif(null)
        }
    }

    async function renameImage(assetId: string) {
        setRenaming(assetId)
        setMessage('')
        try {
            const res = await fetch(`/api/admin/marketing-assets/${assetId}/rename-image`, { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.success) {
                setRenameSuccess(prev => new Set([...prev, assetId]))
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
        setProgress({ current: 0, total: filtered.length, label: 'Renommage des images...' })
        try {
            for (let i = 0; i < filtered.length; i++) {
                const asset = filtered[i]
                const res = await fetch(`/api/admin/marketing-assets/${asset.id}/rename-image`, { method: 'POST' })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success) {
                        successCount++
                        setRenameSuccess(prev => new Set([...prev, asset.id]))
                    }
                }
                setProgress({ current: i + 1, total: filtered.length, label: 'Renommage des images...' })
            }
            setMessage(`${successCount} images renommées avec succès !`)
        } catch (e) {
            setMessage('Erreur réseau lors du renommage global.')
        } finally {
            setRenaming(null)
            setTimeout(() => setProgress(null), 2000)
        }
    }

    async function compressWebp(assetId: string) {
        setCompressing(assetId)
        setMessage('')
        try {
            const res = await fetch(`/api/admin/marketing-assets/${assetId}/compress-webp`, { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.success) {
                setCompressSuccess(prev => new Set([...prev, assetId]))
                setTimeout(() => setCompressSuccess(prev => { const n = new Set(prev); n.delete(assetId); return n }), 3000)
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
                const asset = filtered[i]
                if (asset.url?.toLowerCase().endsWith('.webp')) {
                    setProgress({ current: i + 1, total: filtered.length, label: 'Compression WEBP des images...' })
                    continue
                }
                const res = await fetch(`/api/admin/marketing-assets/${asset.id}/compress-webp`, { method: 'POST' })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success) {
                        successCount++
                        setCompressSuccess(prev => new Set([...prev, asset.id]))
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
                const asset = filtered[i]
                const edit = edits[asset.id]
                if (!edit) {
                    setProgress({ current: i + 1, total: filtered.length, label: 'Injection des métadonnées EXIF...' })
                    continue
                }
                try {
                    const res = await fetch(`/api/admin/marketing-assets/${asset.id}/exif-inject`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: edit.title, keywords: edit.keywords })
                    })
                    const contentType = res.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json()
                        if (res.ok && data.success) {
                            successCount++
                            setExifSuccess(prev => new Set([...prev, asset.id]))
                        } else {
                            errorCount++
                            console.error(`Erreur EXIF ${asset.name}:`, data.error || res.statusText)
                        }
                    } else {
                        errorCount++
                        console.error(`Erreur EXIF ${asset.name}: réponse non-JSON (${res.status})`)
                    }
                } catch (e) {
                    errorCount++
                    console.error(`Erreur réseau EXIF ${asset.name}:`, e)
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
            const asset = filtered[i];
            if (!asset.url) continue;
            try {
                const res = await fetch(asset.url);
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                let filename = asset.url.split('/').pop() || `${asset.id}.jpg`;
                if (filename.includes('?')) filename = filename.split('?')[0];
                a.download = filename;

                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (e) {
                errorCount++;
                console.error(`Erreur téléchargement ${asset.url}`, e);
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

        const frKeywords = "marketing, offre spéciale, promotion livres, tekno promo, remise livre, livraison gratuite maroc";

        assets.forEach(a => {
            updated[a.id] = {
                alt: `${a.name} - ${a.type} | Promotion Tekno Store Maroc`,
                title: `Offre spéciale ${a.name} sur Tekno Store`,
                keywords: `${a.name}, marketing, promotion, offre, tekno, livre, ${frKeywords}`
            }
        })
        setEdits(updated)
    }

    return (
        <div className="space-y-6">
            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <ImageIcon className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-purple-800 mb-1">Injection de métadonnées SEO (Marketing)</p>
                    <p className="text-xs text-purple-700">
                        Optimisez vos images marketing (Bannières, Packs, Offres). Le texte <strong>Alt</strong> et le <strong>Title</strong> aident l'indexation.
                        L'injection <strong>EXIF</strong> intègre ces données directement dans le fichier image.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message.includes('effectuée') || message.includes('enregistrées') || message.includes('téléchargées') || message.includes('terminé') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.includes('effectuée') || message.includes('enregistrées') || message.includes('téléchargées') || message.includes('terminé') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message}
                </div>
            )}

            {progress && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-500">{progress.label}</span>
                        <span className="text-xs font-bold text-gray-900">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-black transition-all duration-300"
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
                        placeholder="Rechercher une image..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                    {injectingExif === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Injecter EXIF tout
                </button>
                <button
                    type="button"
                    onClick={renameAll}
                    disabled={renaming === 'all'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50"
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

            {/* Liste des assets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filtered.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8 col-span-full">Aucune image trouvée.</p>
                )}
                {filtered.map(asset => (
                    <div key={asset.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors flex flex-col h-full">
                        <div className="flex gap-4 items-start">
                            {/* Image */}
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0">
                                <img
                                    src={asset.url?.startsWith('/') && process.env.NODE_ENV === 'development' ? `https://tekno.ma${asset.url}` : asset.url || '/placeholder.jpg'}
                                    alt={edits[asset.id]?.alt || asset.name}
                                    title={edits[asset.id]?.title || asset.name}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                                />
                            </div>

                            {/* Fields */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-0.5">{asset.name}</p>
                                    <p className="text-xs text-gray-400">Type: {asset.type}</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Alt Text (indexé par Google Images)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[asset.id]?.alt || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], alt: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                        placeholder={`${asset.name} | Promotion Tekno Store`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Title (tooltip + SEO)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[asset.id]?.title || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], title: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                        placeholder={`Promotion ${asset.name}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Mots clés EXIF (séparés par virgule)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[asset.id]?.keywords || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], keywords: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                        placeholder={`Marketing, Promo, Tekno Store, ...`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save individual (Actions at the bottom) */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                            <button
                                type="button"
                                onClick={() => saveAsset(asset.id)}
                                disabled={saving === asset.id}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {saving === asset.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : saved.has(asset.id) ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                )}
                                {saved.has(asset.id) ? 'Sauvé' : 'Sauver SEO'}
                            </button>

                            <button
                                type="button"
                                onClick={() => injectExif(asset.id)}
                                disabled={injectingExif === asset.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${exifSuccess.has(asset.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'} disabled:opacity-50`}
                            >
                                {injectingExif === asset.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : exifSuccess.has(asset.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {exifSuccess.has(asset.id) ? 'Injecté !' : 'EXIF'}
                            </button>

                            <button
                                type="button"
                                onClick={() => renameImage(asset.id)}
                                disabled={renaming === asset.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${renameSuccess.has(asset.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-pink-700 border-pink-200 hover:bg-pink-50'} disabled:opacity-50`}
                            >
                                {renaming === asset.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : renameSuccess.has(asset.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <ImageIcon className="w-3 h-3" />
                                )}
                                {renameSuccess.has(asset.id) ? 'Renommé !' : 'Renommer'}
                            </button>

                            <button
                                type="button"
                                onClick={() => compressWebp(asset.id)}
                                disabled={compressing === asset.id || asset.url?.toLowerCase().endsWith('.webp')}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${compressSuccess.has(asset.id) || asset.url?.toLowerCase().endsWith('.webp') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'} disabled:opacity-50`}
                            >
                                {compressing === asset.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : compressSuccess.has(asset.id) || asset.url?.toLowerCase().endsWith('.webp') ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <ImageIcon className="w-3 h-3" />
                                )}
                                {asset.url?.toLowerCase().endsWith('.webp') ? 'WEBP OK' : compressSuccess.has(asset.id) ? 'Compressé' : 'To WEBP'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
