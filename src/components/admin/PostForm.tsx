'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createPost, updatePost } from '@/lib/actions/blog'
import { uploadPostImage } from '@/lib/actions/upload'
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Sparkles, ExternalLink, Star } from 'lucide-react'
import { generatePostContent } from '@/lib/actions/gemini'
import Link from 'next/link'
import { Book as BookIcon, Search, X, Wand2, Copy, Check, ClipboardPaste } from 'lucide-react'
import { fetchBooks } from '@/lib/actions/books'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { getUsers } from '@/lib/actions/users'
import { useEffect } from 'react'
import PostSectionEditor from './post-form/PostSectionEditor'
import { useUIStore } from '@/store/ui'

interface PostFormProps {
    post?: any
    isEditing?: boolean
}

export default function PostForm({ post, isEditing = false }: PostFormProps) {
    const router = useRouter()
    const { locale } = useParams()
    const lang = typeof locale === 'string' ? locale : 'fr'
    const { showNotification } = useUIStore()
    const [isPending, setIsPending] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isRephrasingExcerpt, setIsRephrasingExcerpt] = useState(false)
    const [isRephrasingTitle, setIsRephrasingTitle] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copiedPrompt, setCopiedPrompt] = useState(false)

    // Form state
    const [title, setTitle] = useState(post?.title || '')
    const [slug, setSlug] = useState(post?.slug || '')
    const [category, setCategory] = useState(post?.category || '')
    const [excerpt, setExcerpt] = useState(post?.excerpt || '')
    const [content, setContent] = useState(post?.content || '')
    const [published, setPublished] = useState(post?.published || false)
    const [isFeatured, setIsFeatured] = useState(post?.isFeatured || false)
    const [coverImage, setCoverImage] = useState(post?.coverImage || '')
    const [tags, setTags] = useState(post?.tags || '')
    const [authorName, setAuthorName] = useState(post?.authorName || '')
    const [language, setLanguage] = useState(post?.language || lang)
    const [authorId, setAuthorId] = useState(post?.authorId || '')
    const [adminUsers, setAdminUsers] = useState<any[]>([])
    const [allBooks, setAllBooks] = useState<any[]>([])
    const [bookSearch, setBookSearch] = useState('')
    const [selectedBookIds, setSelectedBookIds] = useState<string[]>(post?.books?.map((b: any) => b.id) || [])

    const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const [booksResult, usersResult] = await Promise.all([
                fetchBooks({ limit: 1000, includeInactive: true }),
                getUsers()
            ])
            if (booksResult.success) {
                setAllBooks(booksResult.data)
            }
            if (usersResult.success && usersResult.data) {
                setAdminUsers(usersResult.data)
            }
        }
        loadData()
    }, [])

    const handleFieldGenerate = async (lang: 'fr' | 'ar', type: 'TITLE' | 'EXCERPT' | 'SLUG') => {
        const input = title
        
        if (!input && type !== 'TITLE') {
            showNotification("Veuillez d'abord saisir un titre ou des mots-clés.", "error")
            return
        }

        setIsGenerating(true)
        setError(null)
        try {
            const result = await generatePostContent(input || title, lang, type)
            if (result.success && result.content) {
                if (type === 'TITLE') {
                    setTitle(result.content)
                    if (!isEditing) {
                        setSlug(result.content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                    }
                } else if (type === 'SLUG') {
                    setSlug(result.content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                } else if (type === 'EXCERPT') {
                    setExcerpt(result.content)
                }
            } else {
                setError(result.error || 'Erreur lors de la génération')
            }
        } catch (err) {
            setError('Erreur lors de la génération')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRephraseTitle = async () => {
        if (!title || title.trim() === '') return
        if (lang === 'ar') {
            alert("DeepL Write ne supporte pas l'arabe actuellement.")
            return
        }
        setIsRephrasingTitle(true)
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: title,
                    targetLang: lang === 'en' ? 'EN-US' : 'FR'
                })
            })
            const data = await res.json()
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                const newTitle = data.rephrased[0]
                setTitle(newTitle)
                if (!isEditing && !slug) {
                    setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                }
            } else {
                alert('Erreur DeepL: ' + (data.error || 'Erreur inconnue'))
            }
        } catch (err) {
            alert('Erreur de connexion avec DeepL')
        } finally {
            setIsRephrasingTitle(false)
        }
    }

    const handleCopyChatgptPrompt = () => {
        const promptText = `Agis comme un expert SEO et rédacteur web pour le blog high-tech Tekno Store (tekno.ma). Rédige un résumé accrocheur (extrait) d'environ 30 à 50 mots pour l'article suivant, de manière à donner envie au lecteur de cliquer et de lire la suite.\n\nTitre de l'article : "${title}"\n\nContenu :\n${content}`

        navigator.clipboard.writeText(promptText).then(() => {
            setCopiedPrompt(true)
            setTimeout(() => setCopiedPrompt(false), 2000)
        }).catch(() => {
            alert('Impossible de copier dans le presse-papier')
        })
    }

    const handlePasteExcerpt = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text && text.trim()) {
                setExcerpt(text.trim())
            }
        } catch {
            alert('Impossible de lire le presse-papier')
        }
    }

    const handleRephraseExcerpt = async () => {
        if (!excerpt || excerpt.trim() === '') return
        if (lang === 'ar') {
            alert("DeepL Write ne supporte pas l'arabe actuellement.")
            return
        }
        setIsRephrasingExcerpt(true)
        try {
            const res = await fetch('/api/admin/translate/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: excerpt,
                    targetLang: lang === 'en' ? 'EN-US' : 'FR'
                })
            })
            const data = await res.json()
            if (data.success && data.rephrased && data.rephrased.length > 0) {
                setExcerpt(data.rephrased[0])
            } else {
                alert('Erreur DeepL: ' + (data.error || 'Erreur inconnue'))
            }
        } catch (err) {
            alert('Erreur de connexion avec DeepL')
        } finally {
            setIsRephrasingExcerpt(false)
        }
    }

    const submitForm = async (close: boolean) => {
        setIsPending(true)
        setError(null)

        try {
            const data = {
                title,
                slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                excerpt,
                content,
                coverImage,
                published,
                authorId,
                authorName,
                category,
                tags,
                language,
                isFeatured,
                bookIds: selectedBookIds
            }

            const result = isEditing
                ? await updatePost(post.id, data)
                : await createPost(data)

            if (result.success) {
                if (close) {
                    router.push('/admin/posts')
                    router.refresh()
                } else {
                    showNotification(isEditing ? "Article mis à jour avec succès" : "Article créé avec succès", "success")
                }
            } else {
                setError(result.error as string)
            }
        } catch (err) {
            setError('Une erreur est survenue')
        } finally {
            setIsPending(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            showNotification("L'image est trop volumineuse (max 5MB)", "error")
            return
        }

        const formData = new FormData()
        formData.append('image', file)

        setIsPending(true)
        try {
            const result = await uploadPostImage(formData)
            if (result.success && result.imageUrl) {
                setCoverImage(result.imageUrl)
                showNotification("Image uploadée avec succès", "success")
            } else {
                showNotification(result.error || "Erreur lors de l'upload", "error")
            }
        } catch (err) {
            showNotification("Erreur lors de l'upload", "error")
        } finally {
            setIsPending(false)
        }
    }

    // Auto-generate slug from title if slug is empty
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value
        setTitle(newTitle)
        if (!isEditing && !slug) {
            setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
        }
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); submitForm(false); }} className="space-y-8 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/${lang}/admin/posts`}
                        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                    </Link>
                    <a
                        href={isEditing ? `/${lang}/blog/${slug}` : `/${lang}/blog`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                    >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Voir page article
                    </a>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => submitForm(false)}
                        disabled={isPending}
                        className="inline-flex items-center px-4 py-2 bg-white text-black border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                    <button
                        type="button"
                        onClick={() => submitForm(true)}
                        disabled={isPending}
                        className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isEditing ? 'Mettre à jour et Fermer' : 'Publier et Fermer'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                {/* Navigation des sections (Sticky) */}
                <div className="lg:col-span-3 sticky top-4 z-40 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-2 md:gap-4 justify-center md:justify-start">
                    <a href="#section-general" className="px-4 py-2 text-xs md:text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-colors">
                        1. Informations Générales
                    </a>
                    <a href="#section-content" className="px-4 py-2 text-xs md:text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-colors">
                        2. Contenu de l'article
                    </a>
                    <a href="#section-settings" className="px-4 py-2 text-xs md:text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-colors">
                        3. Paramètres & Médias
                    </a>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div id="section-general" className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-8 scroll-mt-24 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Titre de l'article</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleFieldGenerate('ar', 'TITLE')}
                                        disabled={isGenerating}
                                        className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-black uppercase hover:bg-green-100 disabled:opacity-50 border border-green-100 flex items-center gap-1"
                                    >
                                        {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                        AR
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFieldGenerate('fr', 'TITLE')}
                                        disabled={isGenerating}
                                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase hover:bg-blue-100 disabled:opacity-50 border border-blue-100 flex items-center gap-1"
                                    >
                                        {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                        FR
                                    </button>
                                    {lang !== 'ar' && (
                                        <button
                                            type="button"
                                            onClick={handleRephraseTitle}
                                            disabled={isRephrasingTitle}
                                            className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-black uppercase hover:bg-purple-100 disabled:opacity-50 border border-purple-100 flex items-center gap-1"
                                            title="Améliorer avec DeepL Write"
                                        >
                                            {isRephrasingTitle ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                                            Améliorer
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 font-bold text-2xl md:text-3xl text-gray-900 placeholder:text-gray-300 shadow-inner"
                                placeholder="Titre captivant de l'article..."
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">URL Slug</label>
                                <button
                                    type="button"
                                    onClick={() => handleFieldGenerate('fr', 'SLUG')}
                                    disabled={isGenerating}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase hover:bg-indigo-100 disabled:opacity-50 border border-indigo-100 flex items-center gap-1"
                                >
                                    {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                    SEO SLUG
                                </button>
                            </div>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm text-gray-500 placeholder:text-gray-300"
                                placeholder="titre-de-l-article"
                                required
                            />
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-[2rem] p-6 md:p-8 border border-gray-100 space-y-6 shadow-sm">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Catégorie</label>
                                <select aria-label="Champ de sélection"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Sélectionner une catégorie</option>
                                    <option value="Développement Personnel">Développement Personnel</option>
                                    <option value="Business & Entrepreneuriat">Business & Entrepreneuriat</option>
                                    <option value="Roman & Fiction">Roman & Fiction</option>
                                    <option value="Histoire & Biographie">Histoire & Biographie</option>
                                    <option value="Spiritualité & Religion">Spiritualité & Religion</option>
                                    <option value="Psychologie">Psychologie</option>
                                    <option value="Santé & Bien-être">Santé & Bien-être</option>
                                    <option value="Science & Technologie">Science & Technologie</option>
                                    <option value="Enfants & Jeunesse">Enfants & Jeunesse</option>
                                    <option value="Actualités & Mises à jour">Actualités & Mises à jour</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Mots-clés (tags)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Ex: productivité, lecture, maroc"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                                />
                                <p className="mt-2 text-[10px] text-gray-400 italic">Séparez les mots-clés par des virgules.</p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Auteur (Utilisateur)</label>
                                <select aria-label="Champ de sélection"
                                    value={authorId}
                                    onChange={(e) => {
                                        setAuthorId(e.target.value)
                                        const selectedUser = adminUsers.find(u => u.id === e.target.value)
                                        setAuthorName(selectedUser ? selectedUser.fullName : '')
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Sélectionner un utilisateur</option>
                                    {adminUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.fullName} ({user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Extrait / Résumé court</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyChatgptPrompt}
                                        className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black uppercase hover:bg-slate-800 border border-slate-700 flex items-center gap-1 transition-all"
                                        title="Copier un prompt pour ChatGPT"
                                    >
                                        {copiedPrompt ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                        Prompt ChatGPT
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePasteExcerpt}
                                        className="px-2 py-0.5 bg-[#1976D2] text-white rounded text-[10px] font-black uppercase hover:bg-blue-700 border border-blue-600 flex items-center gap-1 transition-all"
                                        title="Coller la réponse ChatGPT pour l'extrait"
                                    >
                                        <ClipboardPaste className="w-2.5 h-2.5" />
                                        Coller
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFieldGenerate('ar', 'EXCERPT')}
                                        disabled={isGenerating}
                                        className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-black uppercase hover:bg-green-100 disabled:opacity-50 border border-green-100 flex items-center gap-1"
                                    >
                                        {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                        AR
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFieldGenerate('fr', 'EXCERPT')}
                                        disabled={isGenerating}
                                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase hover:bg-blue-100 disabled:opacity-50 border border-blue-100 flex items-center gap-1"
                                    >
                                        {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                        FR
                                    </button>
                                    {lang !== 'ar' && (
                                        <button
                                            type="button"
                                            onClick={handleRephraseExcerpt}
                                            disabled={isRephrasingExcerpt}
                                            className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-black uppercase hover:bg-purple-100 disabled:opacity-50 border border-purple-100 flex items-center gap-1"
                                            title="Améliorer avec DeepL Write"
                                        >
                                            {isRephrasingExcerpt ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                                            Améliorer
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                rows={3}
                                className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 font-medium text-base text-gray-700 placeholder:text-gray-400 resize-none leading-relaxed shadow-inner"
                                placeholder="Bref résumé accrocheur de l'article..."
                            />
                        </div>

                    </div>
                    
                    <div id="section-content" className="scroll-mt-24">
                        <PostSectionEditor
                            initialContent={post?.content || ''}
                            onChange={setContent}
                            lang={lang as 'fr' | 'ar' | 'en'}
                            postTitle={title}
                        />
                    </div>
                </div>

                <div id="section-settings" className="space-y-8 scroll-mt-24">
                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                        <h3 className="font-black text-gray-900 tracking-tight text-lg relative z-10">Publication</h3>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="published"
                                checked={published}
                                onChange={(e) => setPublished(e.target.checked)}
                                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                            />
                            <label htmlFor="published" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                Publier cet article
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                checked={isFeatured}
                                onChange={(e) => setIsFeatured(e.target.checked)}
                                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 select-none cursor-pointer flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500" />
                                Mettre en vedette (Page d'accueil)
                            </label>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Langue de l'article</label>
                            <select aria-label="Champ de sélection"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                            >
                                <option value="fr">Français (FR)</option>
                                <option value="ar">العربية (AR)</option>
                                <option value="en">English (EN)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                        <h3 className="font-black text-gray-900 tracking-tight text-lg relative z-10">Image de couverture</h3>

                        <div className="flex flex-wrap gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setIsMediaLibraryOpen(true)}
                                className="inline-flex items-center px-4 py-2 text-xs font-bold bg-purple-50 text-purple-700 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Parcourir la Médiathèque
                            </button>
                        </div>

                        {coverImage ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 group">
                                <img 
                                    src={
                                        coverImage.startsWith('http') || coverImage.startsWith('/') || coverImage.startsWith('data:') 
                                            ? coverImage 
                                            : coverImage.startsWith('/9j/') ? `data:image/jpeg;base64,${coverImage}` 
                                            : coverImage.startsWith('iVBOR') ? `data:image/png;base64,${coverImage}` 
                                            : `data:image/jpeg;base64,${coverImage}`
                                    }
                                    alt="Cover" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/a1a1aa?text=Image+Introuvable'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setCoverImage('')}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                >
                                    Supprimer
                                </button>
                            </div>
                        ) : (
                            <div className="aspect-video rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8 mb-2" />
                                <span className="text-xs">Aucune image</span>
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button
                                type="button"
                                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors pointer-events-none"
                            >
                                Choisir une image
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                            JPG, PNG, WebP (Max 5MB)
                        </p>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                        <h3 className="font-black text-gray-900 tracking-tight text-lg relative z-10">Livres liés</h3>
                        <p className="text-[10px] text-gray-500 font-medium">L'article sera affiché sur la page de ces produits.</p>

                        <div className="space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={bookSearch}
                                    onChange={(e) => setBookSearch(e.target.value)}
                                    placeholder="Rechercher un livre..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                                />
                            </div>

                            {/* Selected Books */}
                            {selectedBookIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 py-2">
                                    {selectedBookIds.map(id => {
                                        const book = allBooks.find(b => b.id === id)
                                        return (
                                            <div key={id} className="flex items-center gap-2 px-2 py-1 bg-black text-white rounded text-[10px] font-bold">
                                                <span className="truncate max-w-[120px]">{book?.title || 'Livre...'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBookIds(prev => prev.filter(bid => bid !== id))}
                                                    className="hover:text-red-400"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Book List */}
                            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                                {allBooks
                                    .filter(b => {
                                        if (selectedBookIds.includes(b.id)) return false;
                                        if (!bookSearch.trim()) return true;
                                        const searchTerms = bookSearch.toLowerCase().split(/\s+/).filter(Boolean);
                                        return searchTerms.some(term => b.title.toLowerCase().includes(term));
                                    })
                                    .map(book => (
                                        <button
                                            key={book.id}
                                            type="button"
                                            onClick={() => setSelectedBookIds(prev => [...prev, book.id])}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-50 text-xs font-medium flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                {book.image && (
                                                    <img 
                                                        src={
                                                            book.image.startsWith('http') || book.image.startsWith('/') || book.image.startsWith('data:') 
                                                                ? book.image 
                                                                : book.image.startsWith('/9j/') ? `data:image/jpeg;base64,${book.image}` 
                                                                : book.image.startsWith('iVBOR') ? `data:image/png;base64,${book.image}` 
                                                                : `data:image/jpeg;base64,${book.image}`
                                                        } 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate font-bold text-gray-900">{book.title}</div>
                                                <div className="truncate text-gray-400">{book.author}</div>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <MediaLibraryModal
                isOpen={isMediaLibraryOpen}
                onClose={() => setIsMediaLibraryOpen(false)}
                onSelect={(url) => {
                    setCoverImage(url)
                    setIsMediaLibraryOpen(false)
                }}
            />
        </form>
    )
}
