'use client'

import { useState } from 'react'
import { Image as ImageIcon, Search, CheckCircle2, AlertCircle, Loader2, Tag, Download } from 'lucide-react'

interface Post {
    id: string
    title: string
    authorName?: string
    coverImage?: string
    altText?: string
    imageTitle?: string
    category?: string
    language?: string
}

interface BlogImageInjectorMetaFormProps {
    posts: Post[]
}

export default function BlogImageInjectorMetaForm({ posts }: BlogImageInjectorMetaFormProps) {
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState<string | null>(null)
    const [saved, setSaved] = useState<Set<string>>(new Set())
    
    // New state for EXIF
    const [injectingExif, setInjectingExif] = useState<string | null>(null)
    const [exifSuccess, setExifSuccess] = useState<Set<string>>(new Set())

    // New state for Renaming
    const [renaming, setRenaming] = useState<string | null>(null)
    const [renameSuccess, setRenameSuccess] = useState<Set<string>>(new Set())

    const [edits, setEdits] = useState<Record<string, { alt: string; title: string; keywords: string }>>(
        Object.fromEntries(posts.map(p => [p.id, {
            alt: p.altText || `${p.title} - ${p.authorName || 'Riwaya'} | Blog Riwaya`,
            title: p.imageTitle || `Lire l'article ${p.title} sur le blog Riwaya`,
            keywords: `${p.title}, ${p.authorName || 'Riwaya'}, blog, article, riwaya${p.category ? `, ${p.category}` : ''}`
        }]))
    )
    const [message, setMessage] = useState('')

    const filtered = posts.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        (p.authorName || '').toLowerCase().includes(search.toLowerCase())
    )

    async function savePost(postId: string) {
        setSaving(postId)
        try {
            const res = await fetch(`/api/admin/posts/${postId}/image-seo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edits[postId])
            })
            if (res.ok) {
                setSaved(prev => new Set([...prev, postId]))
                setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(postId); return n }), 2000)
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
        try {
            const entries = Object.entries(edits)
            const chunkSize = 50

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + chunkSize))
                const res = await fetch('/api/admin/posts/image-seo-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ edits: chunk })
                })
                
                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Erreur serveur (${res.status}): Réponse non JSON.`)
                }
                
                if (!res.ok) throw new Error('Erreur API')
            }
            setMessage('Toutes les métadonnées images du blog ont été enregistrées !')
        } catch (e: any) {
            setMessage('Erreur lors de la sauvegarde: ' + e.message)
        } finally {
            setSaving(null)
        }
    }

    async function injectExif(postId: string) {
        setInjectingExif(postId)
        try {
            const res = await fetch(`/api/admin/posts/${postId}/exif-inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: edits[postId].title,
                    keywords: edits[postId].keywords
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setExifSuccess(prev => new Set([...prev, postId]))
                setTimeout(() => setExifSuccess(prev => { const n = new Set(prev); n.delete(postId); return n }), 3000)
            } else {
                alert(data.error || 'Erreur lors de l\'injection EXIF')
            }
        } catch (e) {
            alert('Erreur réseau lors de l\'injection EXIF.')
        } finally {
            setInjectingExif(null)
        }
    }

    async function renameImage(postId: string) {
        setRenaming(postId)
        setMessage('')
        try {
            const res = await fetch(`/api/admin/posts/${postId}/rename-image`, { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.success) {
                setRenameSuccess(prev => new Set([...prev, postId]))
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
        try {
            for (const post of filtered) {
                const res = await fetch(`/api/admin/posts/${post.id}/rename-image`, { method: 'POST' })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success) {
                        successCount++
                        setRenameSuccess(prev => new Set([...prev, post.id]))
                    }
                }
            }
            setMessage(`${successCount} images renommées avec succès !`)
        } catch (e) {
            setMessage('Erreur réseau lors du renommage global.')
        } finally {
            setRenaming(null)
        }
    }

    async function injectExifAll() {
        setInjectingExif('all')
        setMessage('')
        try {
            const entries = Object.entries(edits)
            const chunkSize = 50
            let totalInjected = 0

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + chunkSize))
                const res = await fetch('/api/admin/posts/exif-inject-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ edits: chunk })
                })
                
                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Erreur serveur (${res.status}): Réponse non JSON.`)
                }

                const data = await res.json()
                if (res.ok && data.success) {
                    totalInjected += data.count || Object.keys(chunk).length
                } else {
                    throw new Error(data.error || `Statut ${res.status}`)
                }
            }
            setMessage(`L'injection EXIF a été effectuée sur ${totalInjected} images !`)
        } catch (e: any) {
            setMessage('Erreur réseau lors de l\'injection EXIF globale: ' + e.message)
        } finally {
            setInjectingExif(null)
        }
    }

    function autoGenerateAll() {
        const updated: Record<string, { alt: string; title: string; keywords: string }> = {}
        
        const frKeywords = "blog lecture, articles sur les livres, conseils lecture, riwaya blog, actualité littéraire maroc, chroniques littéraires";
        const arKeywords = "مدونة القراءة, مقالات عن الكتب, نصائح للقراءة, مدونة رواية, أخبار الأدب المغرب, مراجعات الكتب";
        const enKeywords = "reading blog, book articles, reading tips, riwaya blog, literary news morocco, book reviews";

        posts.forEach(p => {
            let baseKeywords = "";
            if (p.language === 'ar') baseKeywords = arKeywords;
            else if (p.language === 'en') baseKeywords = enKeywords;
            else baseKeywords = frKeywords; // Default to French if 'fr' or undefined

            updated[p.id] = {
                alt: `${p.title} - ${p.authorName || 'Riwaya'}${p.category ? ` | ${p.category}` : ''} | Blog Riwaya`,
                title: `Lire "${p.title}" sur le blog de Riwaya`,
                keywords: `${p.title}, ${p.authorName || 'Riwaya'}, blog, article, riwaya${p.category ? `, ${p.category}` : ''}, ${baseKeywords}`
            }
        })
        setEdits(updated)
    }

    return (
        <div className="space-y-6">
            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <ImageIcon className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-orange-800 mb-1">Injection de métadonnées SEO (Blog)</p>
                    <p className="text-xs text-orange-700">
                        Optimisez les images de vos articles de blog. Le texte <strong>Alt</strong> et le <strong>Title</strong> aident l'indexation.
                        L'injection <strong>EXIF</strong> intègre ces données directement dans le fichier image.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message.includes('effectuée') || message.includes('enregistrées') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.includes('effectuée') || message.includes('enregistrées') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message}
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
                        placeholder="Rechercher un article..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                    {injectingExif === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Injecter EXIF tout
                </button>
                <button
                    type="button"
                    onClick={renameAll}
                    disabled={renaming === 'all'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {renaming === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Renommer tout
                </button>
            </div>

            {/* Liste des posts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filtered.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8 col-span-full">Aucun article trouvé.</p>
                )}
                {filtered.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors flex flex-col h-full">
                        <div className="flex gap-4 items-start">
                            {/* Image */}
                            <div className="w-24 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0">
                                <img
                                    src={post.coverImage || '/placeholder.jpg'}
                                    alt={edits[post.id]?.alt || post.title}
                                    title={edits[post.id]?.title || post.title}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                                />
                            </div>

                            {/* Fields */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-0.5">{post.title}</p>
                                    <p className="text-xs text-gray-400">{post.authorName || 'Riwaya'}</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Alt Text (indexé par Google Images)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[post.id]?.alt || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [post.id]: { ...prev[post.id], alt: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        placeholder={`${post.title} | Blog Riwaya`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Title (tooltip + SEO)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[post.id]?.title || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [post.id]: { ...prev[post.id], title: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        placeholder={`Lire l'article ${post.title}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                        Mots clés EXIF (séparés par virgule)
                                    </label>
                                    <input
                                        type="text"
                                        value={edits[post.id]?.keywords || ''}
                                        onChange={e => setEdits(prev => ({ ...prev, [post.id]: { ...prev[post.id], keywords: e.target.value } }))}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        placeholder={`Blog, Riwaya, ...`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save individual (Actions at the bottom) */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                            <button
                                type="button"
                                onClick={() => savePost(post.id)}
                                disabled={saving === post.id}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {saving === post.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : saved.has(post.id) ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                )}
                                {saved.has(post.id) ? 'Sauvé' : 'Sauver SEO'}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => injectExif(post.id)}
                                disabled={injectingExif === post.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${exifSuccess.has(post.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50'} disabled:opacity-50`}
                            >
                                {injectingExif === post.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : exifSuccess.has(post.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {exifSuccess.has(post.id) ? 'Injecté !' : 'EXIF'}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => renameImage(post.id)}
                                disabled={renaming === post.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black rounded-lg transition-colors border ${renameSuccess.has(post.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'} disabled:opacity-50`}
                            >
                                {renaming === post.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : renameSuccess.has(post.id) ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                    <ImageIcon className="w-3 h-3" />
                                )}
                                {renameSuccess.has(post.id) ? 'Renommé !' : 'Renommer'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
