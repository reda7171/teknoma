'use client'

import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, Loader2, BookOpen, X, ArrowRight, Clock, Mic, Camera, Sparkles } from 'lucide-react'
import { searchBooksPredictive, getPopularSearches, recognizeBookCover } from '@/lib/actions/search'
import Image from 'next/image'
// import Link from 'next/link' <-- use i18n link
import { Link, useRouter } from '@/i18n/routing'

import { trackBadgeClick } from '@/lib/actions/analytics'
import { useTranslations, useLocale } from 'next-intl'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { normalizeImage } from '@/lib/utils'
import { getLocalizedTitle, getLocalizedPackTitle, generateBookUrl } from '@/lib/i18n-utils'

const Countdown = ({ expiresAt }: { expiresAt: string | Date }) => {
    const [timeLeft, setTimeLeft] = useState('')
    const t = useTranslations('PredictiveSearch');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(expiresAt).getTime() - new Date().getTime()
            if (difference <= 0) return t('Terminated')

            const hours = Math.floor(difference / (1000 * 60 * 60))
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            return `${hours}h ${minutes}m ${seconds}s`
        }

        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
        return () => clearInterval(timer)
    }, [expiresAt])

    return (
        <div className="flex items-center gap-1.5 mt-0.5 text-[8px] font-black text-orange-600 animate-pulse uppercase tracking-tight">
            <Clock className="w-2.5 h-2.5" />
            <span>{t('EndsIn', { time: timeLeft })}</span>
        </div>
    )
}

export default function PredictiveSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [suggestion, setSuggestion] = useState<string | null>(null)
    const [history, setHistory] = useState<string[]>([])
    const [selectedIndex, setSelectedIndex] = useState(-1)

    const [popularSearches, setPopularSearches] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false)
    const [isAnalyzingCover, setIsAnalyzingCover] = useState(false)
    const [detectedCoverTitle, setDetectedCoverTitle] = useState<string | null>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const clientCache = useRef<Map<string, { results: any[]; suggestion: string | null }>>(new Map())
    const router = useRouter()
    const t = useTranslations('PredictiveSearch');
    const locale = useLocale();

    // Charger l'historique et les catégories au montage
    useEffect(() => {
        const savedHistory = localStorage.getItem('riwaya_search_history')
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory))
        }

        // Charger les recherches populaires
        getPopularSearches().then((data: any) => setPopularSearches(data))

        // Détection de la compatibilité Web Speech API
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                setHasSpeechRecognition(true)
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        // Raccourci clavier global Ctrl+K / Cmd+K
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('keydown', handleGlobalKeyDown)
        }
    }, [])

    const handleVoiceSearch = () => {
        if (typeof window === 'undefined') return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) return

        if (isListening) {
            setIsListening(false)
            return
        }

        try {
            const recognition = new SpeechRecognition()
            recognition.lang = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-US' : 'fr-FR'
            recognition.interimResults = false
            recognition.maxAlternatives = 1

            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            recognition.onerror = () => setIsListening(false)
            recognition.onresult = (event: any) => {
                const transcript = event.results[0]?.[0]?.transcript
                if (transcript) {
                    setQuery(transcript)
                    inputRef.current?.focus()
                    setIsOpen(true)
                }
            }

            recognition.start()
        } catch {
            setIsListening(false)
        }
    }

    // Limite : 2 recherches par couverture max par session
    const COVER_SEARCH_LIMIT = 2
    const COVER_SEARCH_KEY = 'riwaya_cover_search_count'

    const getCoverSearchCount = (): number => {
        try {
            return parseInt(sessionStorage.getItem(COVER_SEARCH_KEY) || '0', 10)
        } catch { return 0 }
    }

    const incrementCoverSearchCount = () => {
        try {
            sessionStorage.setItem(COVER_SEARCH_KEY, String(getCoverSearchCount() + 1))
        } catch { /* ignore */ }
    }

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Vérifier la limite par session
        if (getCoverSearchCount() >= COVER_SEARCH_LIMIT) {
            alert(t('CoverLimitReached') || 'Vous avez atteint la limite de recherche par couverture pour cette session.')
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        try {
            setIsAnalyzingCover(true)
            setDetectedCoverTitle(null)
            setIsOpen(true)

            const formData = new FormData()
            formData.append('image', file)

            const res = await recognizeBookCover(formData)
            incrementCoverSearchCount()

            if (res.success && res.title) {
                setQuery(res.title)
                setDetectedCoverTitle(res.title)
                if (res.results && res.results.length > 0) {
                    setResults(res.results)
                }
                saveToHistory(res.title)
                inputRef.current?.focus()
            } else {
                alert(res.error || t('CoverError'))
            }
        } catch (err: any) {
            console.error('Erreur upload couverture:', err)
            alert(t('CoverError'))
        } finally {
            setIsAnalyzingCover(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const saveToHistory = (searchTerm: string) => {
        if (!searchTerm.trim() || searchTerm.length < 2) return

        const newHistory = [
            searchTerm.trim(),
            ...history.filter(h => h.toLowerCase() !== searchTerm.trim().toLowerCase())
        ].slice(0, 5) // Garder les 5 dernières recherches

        setHistory(newHistory)
        localStorage.setItem('riwaya_search_history', JSON.stringify(newHistory))
    }

    const clearHistory = (e: React.MouseEvent) => {
        e.stopPropagation()
        setHistory([])
        localStorage.removeItem('riwaya_search_history')
    }

    useEffect(() => {
        const cleanQuery = query.toLowerCase().trim()
        if (cleanQuery.length >= 2 && clientCache.current.has(cleanQuery)) {
            const cached = clientCache.current.get(cleanQuery)!
            setResults(cached.results)
            setSuggestion(cached.suggestion)
            setSelectedIndex(-1)
            setIsLoading(false)
            setIsOpen(true)
            return
        }

        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true)
                const data = await searchBooksPredictive(query)
                const items = Array.isArray(data) ? data : (data?.results || [])
                const didYouMean = Array.isArray(data) ? null : (data?.suggestion || null)
                clientCache.current.set(cleanQuery, { results: items, suggestion: didYouMean })
                setResults(items)
                setSuggestion(didYouMean)
                setSelectedIndex(-1)
                setIsLoading(false)
                setIsOpen(true)
            } else {
                setResults([])
                setSuggestion(null)
                // Si l'input est vide on affiche l'historique ou les thèmes
                if (query.length === 0 && history.length > 0) {
                    // L'état isOpen est géré par onFocus
                } else {
                    setIsOpen(false)
                }
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, history.length])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            saveToHistory(query)
            fbPixelEvents.search(query.trim())
            router.push(`/books?search=${encodeURIComponent(query.trim())}`)
            setIsOpen(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
            e.preventDefault();
            const selectedItem = results[selectedIndex];
            saveToHistory(query);
            setIsOpen(false);
            const targetUrl = selectedItem.type === 'PACK'
                ? `/packs/${selectedItem.id}`
                : generateBookUrl(selectedItem, locale);
            router.push(targetUrl);
        }
    }

    const handleHistoryClick = (searchTerm: string) => {
        setQuery(searchTerm)
        saveToHistory(searchTerm)
        router.push(`/books?search=${encodeURIComponent(searchTerm)}`)
        setIsOpen(false)
    }

    const handleCategoryClick = (category: string, badge?: string | null) => {
        if (badge) {
            trackBadgeClick(badge, category)
        }
        router.push(`/books?category=${encodeURIComponent(category)}`)
        setIsOpen(false)
    }

    return (
        <div ref={searchRef} className="relative w-full max-w-xl mx-auto group">
            {/* Form standard modernisé avec commandes interactives */}
            <form onSubmit={handleSearch} className="relative group/input flex items-center" role="search">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCoverUpload}
                />

                <input
                    ref={inputRef}
                    type="text"
                    role="searchbox"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    aria-label={t('Placeholder')}
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => (query.length >= 2 || history.length > 0) && setIsOpen(true)}
                    placeholder={isAnalyzingCover ? t('AnalyzingCover') : isListening ? t('Listening') : t('Placeholder')}
                    className={`w-full bg-white border-2 rounded-[2rem] py-3.5 pl-12 pr-28 rtl:pr-12 rtl:pl-28 sm:pr-36 sm:rtl:pl-36 font-bold text-base text-gray-900 transition-all outline-none placeholder:text-gray-400 shadow-sm hover:border-gray-300 focus:shadow-xl focus:border-black focus:ring-4 focus:ring-black/5 ${
                        isListening ? 'border-red-500 ring-4 ring-red-100' : isAnalyzingCover ? 'border-amber-500 ring-4 ring-amber-100' : 'border-gray-100'
                    }`}
                />

                {isLoading || isAnalyzingCover ? (
                    <Loader2 className="absolute left-4.5 rtl:right-4.5 rtl:left-auto top-1/2 -translate-y-1/2 w-5 h-5 text-black animate-spin pointer-events-none" />
                ) : (
                    <SearchIcon className={`absolute left-4.5 rtl:right-4.5 rtl:left-auto top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200 pointer-events-none ${isOpen ? 'text-black scale-110' : 'text-gray-400 group-hover/input:text-gray-700'}`} />
                )}

                <div className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {/* Bouton effacer unique et bien positionné */}
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('')
                                setDetectedCoverTitle(null)
                                inputRef.current?.focus()
                            }}
                            className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                            aria-label={t('Clear')}
                            title={t('Clear')}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Switcher multimodal : Photo (couverture) & Audio (voix) */}
                    <div className="flex items-center bg-gray-100/90 hover:bg-gray-100 p-0.5 rounded-full border border-gray-200/80 shadow-xs transition-colors">
                        {/* Bouton Reconnaissance Couverture (Image) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzingCover}
                            title={t('CoverSearch')}
                            aria-label={t('CoverSearch')}
                            className={`p-1.5 sm:p-2 rounded-full transition-all ${
                                isAnalyzingCover 
                                    ? 'bg-amber-500 text-white shadow-xs' 
                                    : 'text-gray-500 hover:text-black hover:bg-white'
                            }`}
                        >
                            {isAnalyzingCover ? (
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                        </button>

                        {/* Bouton Recherche Vocale (Audio) */}
                        {hasSpeechRecognition && (
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                title={t('VoiceSearch')}
                                aria-label={t('VoiceSearch')}
                                className={`p-1.5 sm:p-2 rounded-full transition-all ${
                                    isListening 
                                        ? 'bg-red-500 text-white animate-pulse shadow-xs' 
                                        : 'text-gray-500 hover:text-black hover:bg-white'
                                }`}
                            >
                                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        )}
                    </div>

                    {query && (
                        <button
                            type="submit"
                            className="w-8 h-8 rounded-full bg-black hover:bg-gray-800 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm"
                            aria-label={t('Placeholder')}
                        >
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                    )}
                </div>
            </form>

            {/* Dropdown Results - Style Pixio */}
            {isOpen && (
                <div className="absolute top-full inset-x-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-[120%] sm:min-w-[500px] mt-4 bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">

                    {/* Bannière de confirmation de reconnaissance visuelle */}
                    {detectedCoverTitle && (
                        <div className="mx-4 mt-3 mb-1 px-3.5 py-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-amber-900 animate-in fade-in">
                            <div className="flex items-center gap-2 truncate">
                                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                                <span className="truncate">{t('CoverDetected', { title: detectedCoverTitle })}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetectedCoverTitle(null)}
                                className="text-amber-700/60 hover:text-amber-900 p-0.5 rounded-full"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Suggestions si query vide */}
                    {query.length === 0 && (
                        <div className="p-4 space-y-6">
                            {/* Historique */}
                            {history.length > 0 && (
                                <div className="px-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[11px] font-black uppercase text-gray-900 tracking-widest">{t('RecentSearches')}</span>
                                        <button
                                            onClick={clearHistory}
                                            className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 px-2.5 py-1 rounded-full"
                                        >
                                            <X className="w-3 h-3" />
                                            {t('Clear')}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {history.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleHistoryClick(item)}
                                                className="px-4 py-2 bg-gray-50 hover:bg-black hover:text-white rounded-full text-sm font-bold text-gray-600 transition-all"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Recherches populaires */}
                            {popularSearches.length > 0 && (
                                <div className="px-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[11px] font-black uppercase text-gray-900 tracking-widest">{t('PopularSearches')}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {popularSearches.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleHistoryClick(item)}
                                                className="px-4 py-2 bg-pixio-yellow/20 hover:bg-pixio-yellow rounded-full text-sm font-bold text-gray-900 transition-all font-bold"
                                            >
                                                ✨ {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>
                    )}

                    {/* Prediction Results */}
                    {query.length >= 2 && (
                        <>
                            <div className="p-4 border-b border-gray-50 bg-pixio-cream/50 flex justify-between items-center">
                                <span className="text-[11px] font-black uppercase text-gray-900 tracking-widest">{t('Suggestions')}</span>
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                            </div>

                            {suggestion && (
                                <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between text-xs">
                                    <span className="text-amber-900 font-medium">
                                        {t('DidYouMean', { suggestion: '' })}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuery(suggestion)
                                                saveToHistory(suggestion)
                                            }}
                                            className="font-black underline text-amber-950 hover:text-black ml-1 rtl:mr-1 transition-colors cursor-pointer"
                                        >
                                            {suggestion}
                                        </button>
                                    </span>
                                </div>
                            )}

                            <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                                {isLoading && results.length === 0 ? (
                                    <div className="p-4 space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-[1.5rem] animate-pulse">
                                                <div className="w-14 h-20 bg-gray-100 rounded-xl shrink-0"></div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                                                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                                    <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="p-4 space-y-3">
                                        {results.map((item, idx) => {
                                            const isPack = item.type === 'PACK';
                                            const displayTitle = isPack ? getLocalizedPackTitle(item, locale) : getLocalizedTitle(item, locale);
                                            const itemUrl = isPack ? `/packs/${item.id}` : generateBookUrl(item, locale);
                                            return (
                                            <Link
                                                key={item.id}
                                                href={itemUrl}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                onClick={() => {
                                                    saveToHistory(query)
                                                    setIsOpen(false)
                                                }}
                                                className={`flex items-center gap-4 p-4 transition-all group/item shadow-sm rounded-[1.5rem] border ${
                                                    selectedIndex === idx 
                                                    ? 'bg-pixio-beige/30 border-black' 
                                                    : 'bg-white border-gray-100 hover:bg-pixio-beige/30 hover:border-black'
                                                }`}
                                            >
                                                <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50 shadow-sm transition-all group-hover/item:scale-105">
                                                    <Image
                                                        src={normalizeImage(item.image)}
                                                        alt={displayTitle}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {isPack ? (
                                                            <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full tracking-wider">
                                                                {t('PackBadge')}
                                                            </span>
                                                        ) : (
                                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{item.category || 'Collection'}</p>
                                                        )}
                                                    </div>
                                                    <h4 className="font-black text-gray-900 text-sm truncate group-hover/item:text-black transition-colors leading-none">{displayTitle}</h4>
                                                    {isPack ? (
                                                        <p className="text-[10px] font-bold text-amber-800">
                                                            {t('PackBooksCount', { count: item.booksCount || 0 })}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-gray-500 italic">{t('By', { author: item.author })}</p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-sm font-black text-gray-900">{item.price} درهم</span>
                                                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0 rtl:translate-x-2 rtl:group-hover/item:translate-x-0">
                                                            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                ) : !isLoading && (
                                    <div className="p-16 text-center space-y-4 bg-pixio-cream/30 group/empty">
                                        <div className="w-20 h-20 bg-white shadow-xl rounded-[2rem] flex items-center justify-center mx-auto rotate-12 group-hover/empty:rotate-0 transition-transform duration-500">
                                            <BookOpen className="w-10 h-10 text-gray-200" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{t('NoResultsTitle')}</p>
                                            <p className="text-[11px] font-bold text-gray-500 mt-1">{t('NoResultsDesc')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {results.length > 0 && (
                                <div className="p-4 bg-white border-t border-gray-50">
                                    <button
                                        onClick={handleSearch}
                                        className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-black/20 group/all"
                                    >
                                        {t('ViewAll')}
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover/all:translate-x-1 rtl:rotate-180 rtl:group-hover/all:-translate-x-1" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
