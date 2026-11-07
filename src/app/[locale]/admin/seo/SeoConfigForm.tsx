'use client'

import { useState } from 'react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import {
    Save, Globe, Image as ImageIcon, Key, Map, Eye, Share2,
    CheckCircle2, AlertCircle, Tag, BarChart3, Link, Shield, Smartphone, Loader2, Sparkles, Zap
} from 'lucide-react'

interface SeoExpertFormProps {
    initialData: Record<string, string>
}

const SECTIONS = ['identity', 'og', 'verification', 'technical', 'social', 'analytics', 'advanced'] as const
type Section = typeof SECTIONS[number]

const sectionLabels: Record<Section, { label: string; icon: any }> = {
    identity: { label: 'Identité principale', icon: Globe },
    og: { label: 'Open Graph / Social', icon: ImageIcon },
    verification: { label: 'Vérifications Webmaster', icon: Key },
    technical: { label: 'Technique & Robots', icon: Shield },
    social: { label: 'Réseaux sociaux', icon: Share2 },
    analytics: { label: 'Analytics & Tracking', icon: BarChart3 },
    advanced: { label: 'Avancé', icon: Link },
}

export default function SeoConfigForm({ initialData }: SeoExpertFormProps) {
    const d = initialData
    const [form, setForm] = useState({
        // Identité
        seo_default_title: d['seo_default_title'] || 'Riwaya - Votre librairie en ligne au Maroc | Romans et Livres',
        seo_default_description: d['seo_default_description'] || 'Découvrez Riwaya, la meilleure librairie en ligne au Maroc. Achetez vos livres, romans, et ouvrages de développement personnel avec livraison rapide partout au Maroc et paiement à la livraison (COD).',
        seo_default_keywords: d['seo_default_keywords'] || 'librairie en ligne maroc, acheter livre maroc, romans maroc, livres de poche, développement personnel, riwaya, livres pas cher',
        seo_canonical_url: d['seo_canonical_url'] || 'https://riwaya.store',
        seo_site_name: d['seo_site_name'] || 'Riwaya',
        seo_author: d['seo_author'] || 'Riwaya Team',
        seo_language: d['seo_language'] || 'fr-MA',
        // Open Graph
        seo_og_image: d['seo_og_image'] || 'https://riwaya.store/og-image.jpg',
        seo_og_image_width: d['seo_og_image_width'] || '1200',
        seo_og_image_height: d['seo_og_image_height'] || '630',
        seo_og_image_alt: d['seo_og_image_alt'] || 'Riwaya - Librairie en ligne au Maroc',
        seo_og_type: d['seo_og_type'] || 'website',
        seo_og_locale: d['seo_og_locale'] || 'fr_MA',
        seo_twitter_handle: d['seo_twitter_handle'] || '@riwaya_ma',
        seo_twitter_card: d['seo_twitter_card'] || 'summary_large_image',
        seo_twitter_image: d['seo_twitter_image'] || 'https://riwaya.store/twitter-image.jpg',
        // Vérifications
        seo_google_verification: d['seo_google_verification'] || '',
        seo_bing_verification: d['seo_bing_verification'] || '',
        seo_yandex_verification: d['seo_yandex_verification'] || '',
        seo_pinterest_verification: d['seo_pinterest_verification'] || '',
        // Technique
        seo_favicon_url: d['seo_favicon_url'] || '/favicon.ico',
        seo_robots_txt: d['seo_robots_txt'] || 'User-agent: *\nAllow: /\nSitemap: https://riwaya.store/sitemap.xml\nSitemap: https://riwaya.store/sitemap-sellers.xml',
        seo_robots_meta: d['seo_robots_meta'] || 'index, follow',
        seo_viewport: d['seo_viewport'] || 'width=device-width, initial-scale=1',
        seo_theme_color: d['seo_theme_color'] || '#000000',
        // Réseaux sociaux
        seo_facebook_page: d['seo_facebook_page'] || 'https://facebook.com/riwaya.store',
        seo_instagram_handle: d['seo_instagram_handle'] || '@riwaya.store',
        seo_youtube_channel: d['seo_youtube_channel'] || 'https://youtube.com/@riwaya_store',
        seo_tiktok_handle: d['seo_tiktok_handle'] || '@riwaya.store',
        // Analytics
        seo_google_analytics_id: d['seo_google_analytics_id'] || '',
        seo_gtm_id: d['seo_gtm_id'] || '',
        seo_hotjar_id: d['seo_hotjar_id'] || '',
        // Avancé
        seo_schema_org_type: d['seo_schema_org_type'] || 'OnlineStore',
        seo_price_range: d['seo_price_range'] || '50 درهم - 300 درهم',
        seo_address_city: d['seo_address_city'] || 'Casablanca',
        seo_address_country: d['seo_address_country'] || 'MA',
        seo_contact_phone: d['seo_contact_phone'] || '+212 6 00 00 00 00',
        seo_contact_email: d['seo_contact_email'] || 'contact@riwaya.store',
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [openSection, setOpenSection] = useState<Section>('identity')

    const [isGeneratingTitleFR, setIsGeneratingTitleFR] = useState(false)
    const [isGeneratingTitleAR, setIsGeneratingTitleAR] = useState(false)
    const [isGeneratingDescFR, setIsGeneratingDescFR] = useState(false)
    const [isGeneratingDescAR, setIsGeneratingDescAR] = useState(false)
    const [isGeneratingKeywordsFR, setIsGeneratingKeywordsFR] = useState(false)
    const [isGeneratingKeywordsAR, setIsGeneratingKeywordsAR] = useState(false)
    const [indexNowLoading, setIndexNowLoading] = useState(false)
    const [indexNowStatus, setIndexNowStatus] = useState<{ success?: boolean; submittedCount?: number; error?: string } | null>(null)
    const [indexNowUrlsInput, setIndexNowUrlsInput] = useState('')
    const [showCustomUrlInput, setShowCustomUrlInput] = useState(false)

    const handleIndexNowBulk = async () => {
        setIndexNowLoading(true)
        setIndexNowStatus(null)
        try {
            const res = await fetch('/api/indexnow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allProducts: true }),
            })
            const data = await res.json()
            setIndexNowStatus(data)
        } catch (e: any) {
            setIndexNowStatus({ success: false, error: e.message || 'Erreur réseau' })
        } finally {
            setIndexNowLoading(false)
        }
    }

    const handleIndexNowCustom = async () => {
        const urls = indexNowUrlsInput.split('\n').map(u => u.trim()).filter(Boolean)
        if (urls.length === 0) return
        setIndexNowLoading(true)
        setIndexNowStatus(null)
        try {
            const res = await fetch('/api/indexnow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls }),
            })
            const data = await res.json()
            setIndexNowStatus(data)
        } catch (e: any) {
            setIndexNowStatus({ success: false, error: e.message || 'Erreur réseau' })
        } finally {
            setIndexNowLoading(false)
        }
    }

    const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            const res = await updateMultipleSettings(
                Object.entries(form).map(([key, value]) => ({ key, value, category: 'seo' }))
            )
            if (res.success) {
                setMessage('Configuration SEO sauvegardée avec succès !')
            } else {
                setMessage(`Erreur lors de la sauvegarde : ${res.error}`)
            }
        } catch {
            setMessage('Erreur lors de la sauvegarde.')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateSiteSeo = async (fieldToGen: 'title' | 'description' | 'keywords', lang: 'fr' | 'ar') => {
        let setGenerating;
        let prompt = '';
        if (fieldToGen === 'title') {
            setGenerating = lang === 'fr' ? setIsGeneratingTitleFR : setIsGeneratingTitleAR;
            prompt = lang === 'fr'
                ? "Propose un Meta Title SEO très accrocheur (max 60 caractères) pour la page d'accueil d'une librairie en ligne au Maroc nommée Riwaya. Ne donne que le titre sans guillemets."
                : "اقترح عنوان Meta Title جذاب جدا (بحد أقصى 60 حرفًا) للصفحة الرئيسية لمكتبة إلكترونية في المغرب تسمى Riwaya. أعطني العنوان فقط بدون علامات تنصيص.";
        } else if (fieldToGen === 'description') {
            setGenerating = lang === 'fr' ? setIsGeneratingDescFR : setIsGeneratingDescAR;
            prompt = lang === 'fr'
                ? "Rédige une Meta Description SEO persuasive (max 160 caractères) pour la page d'accueil d'une librairie en ligne au Maroc nommée Riwaya. Ne donne que la description sans guillemets."
                : "اكتب وصف Meta Description مقنع (بحد أقصى 160 حرفًا) للصفحة الرئيسية لمكتبة إلكترونية في المغرب تسمى Riwaya. أعطني الوصف فقط بدون علامات تنصيص.";
        } else if (fieldToGen === 'keywords') {
            setGenerating = lang === 'fr' ? setIsGeneratingKeywordsFR : setIsGeneratingKeywordsAR;
            prompt = lang === 'fr'
                ? "Génère 10 à 15 mots-clés SEO pertinents (séparés par des virgules) pour une librairie en ligne au Maroc nommée Riwaya. Ne donne que les mots-clés."
                : "قم بتوليد 10 إلى 15 كلمة مفتاحية SEO ذات صلة (مفصولة بفواصل) لمكتبة إلكترونية في المغرب تسمى Riwaya. أعطني الكلمات المفتاحية فقط.";
        }

        if (!setGenerating) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();
            if (data.text) {
                const cleanText = data.text.replace(/["'*]/g, '').trim();
                if (fieldToGen === 'title') update('seo_default_title', cleanText);
                if (fieldToGen === 'description') update('seo_default_description', cleanText);
                if (fieldToGen === 'keywords') update('seo_default_keywords', cleanText);
            }
        } catch (err) {
            console.error(err);
        }
        setGenerating(false);
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetKey: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (data.success && data.url) {
                update(targetKey, data.url)
            } else {
                setMessage('Erreur lors de l\'upload de l\'image')
            }
        } catch (error) {
            setMessage('Erreur réseau lors de l\'upload')
        }
    }

    const titleLen = form.seo_default_title.length
    const descLen = form.seo_default_description.length

    const input = (key: keyof typeof form, placeholder: string, type = 'text') => (
        <input
            type={type}
            value={form[key]}
            onChange={e => update(key, e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            placeholder={placeholder}
        />
    )

    const field = (label: string, key: keyof typeof form, placeholder: string, type = 'text', hint?: string) => (
        <div key={key}>
            <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{label}</label>
            {input(key, placeholder, type)}
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    )

    const SectionHeader = ({ s }: { s: Section }) => {
        const { label, icon: Icon } = sectionLabels[s]
        const isOpen = openSection === s
        return (
            <button
                type="button"
                onClick={() => setOpenSection(isOpen ? s : s)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-left transition-all border ${isOpen ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
                <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-gray-500'}`} />
                    <span className="text-sm font-black uppercase tracking-widest">{label}</span>
                </div>
                <span className={`text-lg ${isOpen ? 'text-white' : 'text-gray-400'}`}>{isOpen ? '−' : '+'}</span>
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.includes('succès') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                
                {/* Colonne de gauche */}
                <div className="w-full xl:w-1/2 space-y-6">
                    {/* Aperçu SERP */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Aperçu Google (SERP)
                        </p>
                        <div className="max-w-lg">
                            <p className="text-[11px] text-gray-400 mb-1">{form.seo_canonical_url || 'https://riwaya.store'}</p>
                            <p className="text-lg font-medium text-blue-700 leading-tight line-clamp-1">{form.seo_default_title || 'Titre de votre site'}</p>
                            <p className="text-sm text-gray-600 mt-1 leading-snug line-clamp-2">{form.seo_default_description || 'Description...'}</p>
                        </div>
                    </div>

                    {/* 1 — Identité principale */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="identity" />
                        {openSection === 'identity' && (
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Meta Title</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('title', 'fr')}
                                                disabled={isGeneratingTitleFR}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingTitleFR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} FR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('title', 'ar')}
                                                disabled={isGeneratingTitleAR}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingTitleAR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AR
                                            </button>
                                            <span className={`text-xs font-bold ml-2 ${titleLen > 60 ? 'text-red-500' : titleLen > 50 ? 'text-orange-500' : 'text-green-600'}`}>{titleLen}/60</span>
                                        </div>
                                    </div>
                                    {input('seo_default_title', 'Riwaya - Librairie en ligne au Maroc')}
                                </div>
                                <div className="sm:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Meta Description</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('description', 'fr')}
                                                disabled={isGeneratingDescFR}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingDescFR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} FR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('description', 'ar')}
                                                disabled={isGeneratingDescAR}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingDescAR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AR
                                            </button>
                                            <span className={`text-xs font-bold ml-2 ${descLen > 160 ? 'text-red-500' : descLen > 140 ? 'text-orange-500' : 'text-green-600'}`}>{descLen}/160</span>
                                        </div>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={form.seo_default_description}
                                        onChange={e => update('seo_default_description', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-white"
                                        placeholder="Découvrez Riwaya, la librairie en ligne n°1 au Maroc..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Mots-clés (Keywords)</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('keywords', 'fr')}
                                                disabled={isGeneratingKeywordsFR}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingKeywordsFR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} FR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateSiteSeo('keywords', 'ar')}
                                                disabled={isGeneratingKeywordsAR}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingKeywordsAR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AR
                                            </button>
                                        </div>
                                    </div>
                                    {input('seo_default_keywords', 'livres, maroc, librairie, achat')}
                                    <p className="text-xs text-gray-400 mt-1">Séparés par des virgules</p>
                                </div>
                                {field('URL Canonique', 'seo_canonical_url', 'https://riwaya.store', 'url')}
                                {field('Nom du site', 'seo_site_name', 'Riwaya')}
                                {field('Auteur', 'seo_author', 'Riwaya Team')}
                                {field('Langue principale', 'seo_language', 'fr-MA', 'text', 'Ex: fr-MA, ar-MA, en-US')}
                            </div>
                        )}
                    </div>

                    {/* 4 — Technique */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="technical" />
                        {openSection === 'technical' && (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">Favicon (URL)</label>
                                        <div className="flex gap-4 items-center">
                                            {form.seo_favicon_url && (
                                                <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                                                    <img src={form.seo_favicon_url} className="max-w-full max-h-full object-contain" alt="favicon" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                </div>
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="url"
                                                    value={form.seo_favicon_url}
                                                    onChange={e => update('seo_favicon_url', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                                    placeholder="/favicon.ico"
                                                />
                                                <div className="relative mt-2">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(e, 'seo_favicon_url')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="w-full px-4 py-2.5 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 hover:border-black transition-colors cursor-pointer">
                                                        <ImageIcon className="w-4 h-4 mr-2" />
                                                        Uploader un Favicon
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {field('Couleur thème', 'seo_theme_color', '#000000', 'color')}
                                    {field('Viewport', 'seo_viewport', 'width=device-width, initial-scale=1')}
                                    <div>
                                        <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">Robots Meta</label>
                                        <select aria-label="Champ de sélection"
                                            value={form.seo_robots_meta}
                                            onChange={e => update('seo_robots_meta', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                        >
                                            <option value="index, follow">index, follow (recommandé)</option>
                                            <option value="noindex, follow">noindex, follow</option>
                                            <option value="index, nofollow">index, nofollow</option>
                                            <option value="noindex, nofollow">noindex, nofollow</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Robots.txt</label>
                                        <a href="/robots.txt" target="_blank" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> Voir actuel
                                        </a>
                                    </div>
                                    <textarea
                                        rows={5}
                                        value={form.seo_robots_txt}
                                        onChange={e => update('seo_robots_txt', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-gray-50 resize-none"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    <a href="/sitemap.xml" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                        <Map className="w-3.5 h-3.5 text-blue-600" /> Sitemap Général
                                    </a>
                                    <a href="/sitemap-sellers.xml" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                        <Map className="w-3.5 h-3.5 text-emerald-600" /> Sitemap Marchands & Vendeurs
                                    </a>
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                                                IndexNow (Bing, Yandex, Seznam, Naver)
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Soumission automatique active à chaque création/modification de livre ou pack.
                                            </p>
                                        </div>
                                        <a
                                            href="/a918d1a2e64740c2b085b754a73fabbe.txt"
                                            target="_blank"
                                            className="text-[10px] font-bold text-blue-600 hover:underline"
                                        >
                                            Clé vérifiée
                                        </a>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleIndexNowBulk}
                                        disabled={indexNowLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {indexNowLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 text-emerald-400" />
                                        )}
                                        {indexNowLoading ? 'Soumission IndexNow en cours...' : 'Pousser tout le catalogue à IndexNow (AR / FR / EN)'}
                                    </button>

                                    <div className="flex items-center justify-between pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                                            className="text-xs font-bold text-gray-600 hover:text-black underline"
                                        >
                                            {showCustomUrlInput ? 'Masquer la liste d\'URLs personnalisée' : 'Soumettre une liste d\'URLs personnalisée (List of URLs)'}
                                        </button>
                                    </div>

                                    {showCustomUrlInput && (
                                        <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[11px] font-black uppercase text-gray-600 tracking-wider">
                                                    Liste d'URLs (une par ligne)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIndexNowUrlsInput(
                                                        'https://riwaya.store/fr\nhttps://riwaya.store/ar\nhttps://riwaya.store/en\nhttps://riwaya.store/fr/books\nhttps://riwaya.store/ar/books\nhttps://riwaya.store/en/books\nhttps://riwaya.store/fr/packs\nhttps://riwaya.store/ar/packs\nhttps://riwaya.store/en/packs\nhttps://riwaya.store/fr/blog\nhttps://riwaya.store/ar/blog\nhttps://riwaya.store/en/blog'
                                                    )}
                                                    className="text-[10px] font-bold text-blue-600 hover:underline"
                                                >
                                                    Remplir pages principales
                                                </button>
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={indexNowUrlsInput}
                                                onChange={e => setIndexNowUrlsInput(e.target.value)}
                                                placeholder="https://riwaya.store/fr/books/...\nhttps://riwaya.store/fr/packs/..."
                                                className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-black"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleIndexNowCustom}
                                                disabled={indexNowLoading || !indexNowUrlsInput.trim()}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {indexNowLoading ? 'Soumission...' : 'Soumettre cette liste d\'URLs'}
                                            </button>
                                        </div>
                                    )}
                                    {indexNowStatus && (
                                        <div
                                            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                                                indexNowStatus.success
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                    : 'bg-red-50 text-red-800 border border-red-200'
                                            }`}
                                        >
                                            {indexNowStatus.success ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                            )}
                                            <span>
                                                {indexNowStatus.success
                                                    ? `${indexNowStatus.submittedCount || 0} URL(s) soumises avec succès aux moteurs de recherche.`
                                                    : `Erreur: ${indexNowStatus.error || 'Échec de transmission'}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Colonne de droite */}
                <div className="w-full xl:w-1/2 space-y-6">
                    {/* 2 — Open Graph */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="og" />
                        {openSection === 'og' && (
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">Image OG (URL — 1200×630px)</label>
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1 space-y-3">
                                            <input
                                                type="url"
                                                value={form.seo_og_image}
                                                onChange={e => update('seo_og_image', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                                placeholder="https://riwaya.store/og-image.jpg"
                                            />
                                            <div className="relative mt-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, 'seo_og_image')}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-gray-100 hover:border-black transition-colors cursor-pointer">
                                                    <ImageIcon className="w-4 h-4 mr-2" />
                                                    Uploader une Image OG
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Affichée sur Facebook, WhatsApp, LinkedIn, etc.</p>
                                        </div>
                                        {form.seo_og_image && (
                                            <div className="w-40 h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 p-1 relative group">
                                                <img src={form.seo_og_image} className="max-w-full max-h-full object-contain" alt="OG Preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {field('Alt Image OG', 'seo_og_image_alt', 'Riwaya - Librairie en ligne au Maroc')}
                                {field('Image Twitter', 'seo_twitter_image', 'https://riwaya.store/twitter-image.jpg', 'url')}
                                {field('OG Type', 'seo_og_type', 'website', 'text', 'website, book, article...')}
                                {field('OG Locale', 'seo_og_locale', 'fr_MA')}
                                {field('Largeur OG (px)', 'seo_og_image_width', '1200')}
                                {field('Hauteur OG (px)', 'seo_og_image_height', '630')}
                                {field('Handle Twitter', 'seo_twitter_handle', '@riwaya_ma')}
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">Twitter Card</label>
                                    <select aria-label="Champ de sélection"
                                        value={form.seo_twitter_card}
                                        onChange={e => update('seo_twitter_card', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    >
                                        <option value="summary_large_image">summary_large_image</option>
                                        <option value="summary">summary</option>
                                        <option value="app">app</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3 — Vérifications */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="verification" />
                        {openSection === 'verification' && (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {field('Google Search Console', 'seo_google_verification', 'Token Google')}
                                    {field('Bing Webmaster', 'seo_bing_verification', 'Token Bing')}
                                    {field('Yandex Webmaster', 'seo_yandex_verification', 'Token Yandex')}
                                    {field('Pinterest', 'seo_pinterest_verification', 'Token Pinterest')}
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-900">Google Search Console — Audit Indexation & Canoniques</span>
                                        <a
                                            href={`https://search.google.com/search-console/index?resource_id=${encodeURIComponent(form.seo_canonical_url || 'https://riwaya.store')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <Globe className="w-3.5 h-3.5" /> Ouvrir Search Console
                                        </a>
                                    </div>
                                    <p className="text-blue-700 leading-relaxed">
                                        Surveillez le rapport <strong>Indexation &gt; Pages &gt; « Page en double sans URL canonique sélectionnée par l&apos;utilisateur »</strong> pour valider la consolidation du PageRank vers vos URL canoniques propres (UTM et fbclid exclus).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 5 — Réseaux sociaux */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="social" />
                        {openSection === 'social' && (
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {field('Page Facebook (URL)', 'seo_facebook_page', 'https://facebook.com/...', 'url')}
                                {field('Instagram (@handle)', 'seo_instagram_handle', '@riwaya.ma')}
                                {field('YouTube (URL)', 'seo_youtube_channel', 'https://youtube.com/...', 'url')}
                                {field('TikTok (@handle)', 'seo_tiktok_handle', '@riwaya.ma')}
                            </div>
                        )}
                    </div>

                    {/* 6 — Analytics */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="analytics" />
                        {openSection === 'analytics' && (
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {field('Google Analytics 4', 'seo_google_analytics_id', 'G-XXXXXXXXXX')}
                                {field('Google Tag Manager', 'seo_gtm_id', 'GTM-XXXXXXX')}
                                {field('Hotjar (ID)', 'seo_hotjar_id', '1234567')}
                            </div>
                        )}
                    </div>

                    {/* 7 — Avancé */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <SectionHeader s="advanced" />
                        {openSection === 'advanced' && (
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">Type Schema.org</label>
                                    <select aria-label="Champ de sélection"
                                        value={form.seo_schema_org_type}
                                        onChange={e => update('seo_schema_org_type', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    >
                                        <option value="OnlineStore">OnlineStore</option>
                                        <option value="BookStore">BookStore</option>
                                        <option value="Organization">Organization</option>
                                        <option value="LocalBusiness">LocalBusiness</option>
                                    </select>
                                </div>
                                {field('Fourchette prix', 'seo_price_range', '50 - 300 درهم')}
                                {field('Ville', 'seo_address_city', 'Casablanca')}
                                {field('Pays', 'seo_address_country', 'MA')}
                                {field('Téléphone', 'seo_contact_phone', '+212...', 'tel')}
                                {field('Email', 'seo_contact_email', 'contact@riwaya.store', 'email')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-8">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3.5 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Sauvegarder la configuration'}
                </button>
            </div>
        </form>
    )
}
