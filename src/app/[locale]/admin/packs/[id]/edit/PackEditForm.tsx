'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, ImageIcon, Wand2, Languages, AlertTriangle, CheckCircle2, Bot, ClipboardPaste, Zap, X } from 'lucide-react'
import { updatePack, type PackInput } from '@/lib/actions/packs'
import { publishPacksToJumia, checkJumiaLinkBySkuExact } from '@/lib/actions/jumia'
import PackCreativeModal from '@/components/admin/PackCreativeModal'
import ImageInput from '@/components/admin/ImageInput'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import CatalogImageModal from '@/components/admin/CatalogImageModal'
import JumiaPushModal, { type JumiaPushLanguage } from '@/components/admin/JumiaPushModal'

interface Book {
    id: string
    title: string
    titleFr?: string | null
    titleEn?: string | null
    author: string
    price: number
    image?: string
    category?: string | null
    language?: string
    active: boolean
    stock: number
}

function normalizeSearchText(str: string): string {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function getBookSearchTitles(book: Book) {
    return [book.title, book.titleFr, book.titleEn]
        .filter((title): title is string => Boolean(title?.trim()))
        .map(normalizeSearchText)
}

function getBookDisplayTitle(book: Book) {
    const language = book.language?.toLowerCase()
    if (language?.startsWith('en')) return book.titleEn?.trim() || book.title
    if (language?.startsWith('fr')) return book.titleFr?.trim() || book.title
    return book.title
}

function findBookByQuickTitle(books: Book[], token: string) {
    const normalizedToken = normalizeSearchText(token)
    if (!normalizedToken) return undefined

    const preferredLanguage = /[\u0600-\u06FF]/.test(token) ? 'ar' : 'en'
    const candidates = books
        .map(book => ({
            book,
            primaryTitle: normalizeSearchText(book.title),
            translatedTitles: [book.titleFr, book.titleEn]
                .filter((title): title is string => Boolean(title?.trim()))
                .map(normalizeSearchText),
            titles: getBookSearchTitles(book),
        }))
        .sort((left, right) => {
            const leftPreferred = left.book.language?.toLowerCase().startsWith(preferredLanguage) ? 1 : 0
            const rightPreferred = right.book.language?.toLowerCase().startsWith(preferredLanguage) ? 1 : 0
            return rightPreferred - leftPreferred
        })

    const exactPrimary = candidates.find(candidate => candidate.primaryTitle === normalizedToken)
    if (exactPrimary) return exactPrimary.book

    const exactTranslation = candidates.find(candidate => candidate.translatedTitles.some(title => title === normalizedToken))
    if (exactTranslation) return exactTranslation.book

    const primaryStartsWith = candidates.find(candidate => candidate.primaryTitle.startsWith(normalizedToken))
    if (primaryStartsWith) return primaryStartsWith.book

    const translationStartsWith = candidates.find(candidate => candidate.translatedTitles.some(title => title.startsWith(normalizedToken)))
    if (translationStartsWith) return translationStartsWith.book

    const contains = candidates.find(candidate => candidate.titles.some(title => (
        title.includes(normalizedToken) || normalizedToken.includes(title)
    )))
    if (contains) return contains.book

    const words = normalizedToken.split(' ').filter(word => word.length > 1)
    if (words.length === 0) return undefined

    return candidates.find(candidate => {
        const searchableText = normalizeSearchText(`${candidate.titles.join(' ')} ${candidate.book.author}`)
        return words.every(word => searchableText.includes(word))
    })?.book
}

function parseQuickInput(raw: string) {
    const trimmed = raw.trim()
    let packName = ''
    let booksPart = ''

    if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t')
        packName = parts[0].trim()
        booksPart = parts.slice(1).join(' ').trim()
    } else if (trimmed.includes('\n')) {
        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
        packName = lines[0]
        booksPart = lines.slice(1).join(' + ')
    } else if (trimmed.includes('|')) {
        const parts = trimmed.split('|')
        packName = parts[0].trim()
        booksPart = parts.slice(1).join(' + ').trim()
    } else if (trimmed.includes(':') && trimmed.includes('+')) {
        const idx = trimmed.indexOf(':')
        packName = trimmed.slice(0, idx).trim()
        booksPart = trimmed.slice(idx + 1).trim()
    } else if (trimmed.includes(' - ') && trimmed.includes('+')) {
        const idx = trimmed.indexOf(' - ')
        packName = trimmed.slice(0, idx).trim()
        booksPart = trimmed.slice(idx + 3).trim()
    } else if (trimmed.includes('+')) {
        booksPart = trimmed
    } else {
        packName = trimmed
    }

    return { packName, booksPart }
}

function detectPackLanguage(items: { language?: string }[]): 'ar' | 'fr' | 'en' | 'all' {
    if (items.length === 0) return 'all'
    const langs = items
        .map(b => b.language?.toLowerCase() || '')
        .filter(Boolean)
    if (langs.length === 0) return 'all'
    const enCount = langs.filter(l => l.startsWith('en')).length
    const frCount = langs.filter(l => l.startsWith('fr')).length
    const arCount = langs.filter(l => l.startsWith('ar')).length
    if (enCount > 0 && enCount >= frCount && enCount >= arCount) return 'en'
    if (frCount > 0 && frCount >= enCount && frCount >= arCount) return 'fr'
    if (arCount > 0 && arCount >= enCount && arCount >= frCount) return 'ar'
    return 'all'
}

function getLanguageLabel(lang: 'ar' | 'fr' | 'en' | 'all', targetLocale: 'ar' | 'fr' | 'en'): string {
    if (lang === 'en') {
        if (targetLocale === 'ar') return 'en anglais'
        if (targetLocale === 'fr') return '(en anglais)'
        return '(in English)'
    }
    if (lang === 'fr') {
        if (targetLocale === 'ar') return 'en français'
        if (targetLocale === 'fr') return '(en français)'
        return '(in French)'
    }
    if (lang === 'ar') {
        if (targetLocale === 'ar') return '(بالعربية)'
        if (targetLocale === 'fr') return '(en arabe)'
        return '(in Arabic)'
    }
    return ''
}

function appendLanguageSuffix(title: string, lang: 'ar' | 'fr' | 'en' | 'all', targetLocale: 'ar' | 'fr' | 'en'): string {
    const clean = (title || '').replace(/\|/g, '-').replace(/\s+/g, ' ').trim()
    if (!clean || lang === 'all') return clean

    const lower = clean.toLowerCase()
    if (
        lower.includes('anglais') ||
        lower.includes('english') ||
        lower.includes('انجليز') ||
        lower.includes('français') ||
        lower.includes('francais') ||
        lower.includes('french') ||
        lower.includes('فرنس') ||
        lower.includes('arabe') ||
        lower.includes('arabic') ||
        lower.includes('عرب')
    ) {
        return clean
    }

    const suffix = getLanguageLabel(lang, targetLocale)
    if (!suffix) return clean
    return `${clean} ${suffix}`
}

function getPackKeywords(
    packName: string,
    items: Book[],
    locale: 'ar' | 'fr' | 'en'
): string {
    const titles = items.map(b => getBookDisplayTitle(b)).filter(Boolean)
    const authors = Array.from(new Set(items.map(b => b.author?.trim()).filter(Boolean)))
    
    if (locale === 'ar') {
        const baseTags = ['باقة كتب', 'روايات', 'كتب للقراءة', 'شراء كتب في المغرب', 'توصيل كتب المغرب']
        const allKeywords = Array.from(new Set([packName, ...titles, ...authors, ...baseTags].filter(Boolean)))
        return allKeywords.join(', ')
    }
    if (locale === 'en') {
        const baseTags = ['book pack', 'book bundle', 'novels', 'reading', 'books in Morocco', 'bestseller books']
        const allKeywords = Array.from(new Set([packName, ...titles, ...authors, ...baseTags].filter(Boolean)))
        return allKeywords.join(', ')
    }
    const baseTags = ['pack de livres', 'lot de livres', 'romans', 'lecture', 'achat livres Maroc', 'meilleurs livres']
    const allKeywords = Array.from(new Set([packName, ...titles, ...authors, ...baseTags].filter(Boolean)))
    return allKeywords.join(', ')
}

function appendKeywordsToDescription(desc: string, keywords: string, locale: 'ar' | 'fr' | 'en'): string {
    const trimmed = (desc || '').trim()
    if (!keywords) return trimmed

    if (locale === 'ar') {
        if (trimmed.includes('الكلمات المفتاحية') || trimmed.includes('كلمات مفتاحية')) return trimmed
        const prefix = trimmed ? `${trimmed}\n\n` : ''
        return `${prefix}الكلمات المفتاحية: ${keywords}`
    }
    if (locale === 'en') {
        if (trimmed.toLowerCase().includes('keywords:')) return trimmed
        const prefix = trimmed ? `${trimmed}\n\n` : ''
        return `${prefix}Keywords: ${keywords}`
    }
    if (trimmed.toLowerCase().includes('mots-clés') || trimmed.toLowerCase().includes('mots clés')) return trimmed
    const prefix = trimmed ? `${trimmed}\n\n` : ''
    return `${prefix}Mots-clés SEO : ${keywords}`
}

interface PackEditFormProps {
    pack: {
        id: string
        name: string
        nameFr?: string
        nameEn?: string
        language?: string
        description: string
        descriptionFr?: string
        descriptionEn?: string
        price: number
        originalPrice?: number | null
        image: string
        isFreeDelivery: boolean
        shippingFees: number
        sellerSku?: string
        jumiaProductSid?: string
        selectedBookIds: string[]
        isAffiliate?: boolean
        affiliateLink?: string | null
        jumiaHighlights?: string | null
        jumiaPackageContent?: string | null
        [key: string]: any
    }
    books: Book[]
    whatsappPhone?: string
}

export default function PackEditForm({ pack, books, whatsappPhone }: PackEditFormProps) {
    const router = useRouter()
    const formRef = useRef<HTMLFormElement>(null)
    const [loading, setLoading] = useState(false)
    const [isPushingJumia, setIsPushingJumia] = useState(false)
    const [isJumiaModalOpen, setIsJumiaModalOpen] = useState(false)
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [creativeFormat, setCreativeFormat] = useState<'post' | 'story' | null>(null)
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    const [mediaModalTab, setMediaModalTab] = useState<'marketing' | 'books'>('books')
    const [selectedBooks, setSelectedBooks] = useState<string[]>(pack.selectedBookIds)
    const [isFreeDelivery, setIsFreeDelivery] = useState(pack.isFreeDelivery)
    const [shippingFees, setShippingFees] = useState(pack.shippingFees || 30)
    const [isAffiliate, setIsAffiliate] = useState(pack.isAffiliate || false)
    const [affiliateLink, setAffiliateLink] = useState(pack.affiliateLink || '')
    const [searchQuery, setSearchQuery] = useState('')
    const [onlyAvailable, setOnlyAvailable] = useState(true)
    const [filterAuthor, setFilterAuthor] = useState('ALL')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterLanguage, setFilterLanguage] = useState('ALL')
    const [isCatalogOpen, setIsCatalogOpen] = useState(false)
    const [packImage, setPackImage] = useState(pack.image)
    const [isLinked, setIsLinked] = useState(false)

    useEffect(() => {
        if (pack.sellerSku) {
            checkJumiaLinkBySkuExact(pack.sellerSku, pack.jumiaProductSid).then(linked => {
                setIsLinked(linked)
            }).catch(err => {
                setIsLinked(false)
            })
        }
    }, [pack.sellerSku, pack.jumiaProductSid])

    // Champs multilingues
    const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>('ar')
    const [packLanguage, setPackLanguage] = useState<'ar' | 'fr' | 'en' | 'all'>(
        pack.language === 'all' ? 'all' : pack.language === 'en' ? 'en' : pack.language === 'ar' ? 'ar' : 'fr'
    )
    const [name, setName] = useState(pack.name)
    const [nameFr, setNameFr] = useState(pack.nameFr || '')
    const [nameEn, setNameEn] = useState(pack.nameEn || '')
    const [description, setDescription] = useState(pack.description)
    const [descriptionFr, setDescriptionFr] = useState(pack.descriptionFr || '')
    const [descriptionEn, setDescriptionEn] = useState(pack.descriptionEn || '')
    const isPackHighlightsArabic = /[\u0600-\u06FF]/.test(pack.jumiaHighlights || '')
    const [jumiaHighlightsAr, setJumiaHighlightsAr] = useState(
        pack.jumiaHighlightsAr || (isPackHighlightsArabic ? (pack.jumiaHighlights || '') : '')
    )
    const [jumiaHighlightsFr, setJumiaHighlightsFr] = useState(
        pack.jumiaHighlightsFr || (!isPackHighlightsArabic ? (pack.jumiaHighlights || '') : '')
    )
    const [jumiaHighlightsEn, setJumiaHighlightsEn] = useState(pack.jumiaHighlightsEn || '')
    const isPackContentArabic = /[\u0600-\u06FF]/.test(pack.jumiaPackageContent || '')
    const [jumiaPackageContentAr, setJumiaPackageContentAr] = useState(
        pack.jumiaPackageContentAr || (isPackContentArabic ? (pack.jumiaPackageContent || '') : '')
    )
    const [jumiaPackageContentFr, setJumiaPackageContentFr] = useState(
        pack.jumiaPackageContentFr || (!isPackContentArabic ? (pack.jumiaPackageContent || '') : '')
    )
    const [jumiaPackageContentEn, setJumiaPackageContentEn] = useState(pack.jumiaPackageContentEn || '')
    const [isTranslating, setIsTranslating] = useState(false)
    const [translateMsg, setTranslateMsg] = useState<string | null>(null)
    const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false)
    const [isGeneratingContent, setIsGeneratingContent] = useState(false)
    const [quickInput, setQuickInput] = useState('')
    const [quickInputResult, setQuickInputResult] = useState<{
        packName?: string
        matched: { token: string; title: string; id: string }[]
        notFound: string[]
    } | null>(null)

    function handleApplyQuickInput() {
        if (!quickInput.trim()) return

        const { packName, booksPart } = parseQuickInput(quickInput)

        if (packName) {
            const clean = packName.replace(/\|/g, '-').replace(/\s+/g, ' ').trim()
            setName(clean)
            if (!/[\u0600-\u06FF]/.test(clean)) {
                setNameFr(clean)
            }
        }

        const matched: { token: string; title: string; id: string }[] = []
        const notFound: string[] = []

        if (booksPart) {
            const tokens = booksPart.includes('+')
                ? booksPart.split('+').map(t => t.trim()).filter(Boolean)
                : booksPart.split(/[,;\n]/).map(t => t.trim()).filter(Boolean)

            const matchedIds: string[] = []

            tokens.forEach(token => {
                const nt = normalizeSearchText(token)
                if (!nt) return

                const found = findBookByQuickTitle(books, token)

                if (found) {
                    matched.push({ token, title: getBookDisplayTitle(found), id: found.id })
                    matchedIds.push(found.id)
                } else {
                    notFound.push(token)
                }
            })

            if (matchedIds.length > 0) {
                setSelectedBooks(prev => {
                    const next = Array.from(new Set([...prev, ...matchedIds]))
                    const detected = detectPackLanguage(books.filter(b => next.includes(b.id)))
                    if (detected !== 'all') {
                        setPackLanguage(detected)
                    }
                    return next
                })
            }
        }

        setQuickInputResult({ packName, matched, notFound })
    }

    function toggleBook(bookId: string) {
        setSelectedBooks(prev => {
            const next = prev.includes(bookId)
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId]
            const detected = detectPackLanguage(books.filter(b => next.includes(b.id)))
            if (detected !== 'all') {
                setPackLanguage(detected)
            }
            return next
        })
    }

    function toggleAll() {
        if (selectedBooks.length === books.length) {
            setSelectedBooks([])
        } else {
            setSelectedBooks(books.map(b => b.id))
        }
    }

    function toggleAllInCategory(categoryBooks: Book[]) {
        const categoryBookIds = categoryBooks.map(b => b.id)
        const allSelected = categoryBookIds.every(id => selectedBooks.includes(id))
        if (allSelected) {
            setSelectedBooks(prev => prev.filter(id => !categoryBookIds.includes(id)))
        } else {
            setSelectedBooks(prev => Array.from(new Set([...prev, ...categoryBookIds])))
        }
    }

    // Traduction automatique AR → FR + EN via DeepL
    async function handleAutoTranslate() {
        setIsTranslating(true)
        setTranslateMsg(null)
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'book', title: name, description, sourceLang: 'AR' })
            })
            const data = await res.json()
            if (data.titleFr) setNameFr(data.titleFr)
            if (data.titleEn) setNameEn(data.titleEn)
            if (data.descriptionFr) setDescriptionFr(data.descriptionFr)
            if (data.descriptionEn) setDescriptionEn(data.descriptionEn)
            setTranslateMsg('Traduction terminée !')
        } catch {
            setTranslateMsg('Erreur lors de la traduction.')
        } finally {
            setIsTranslating(false)
        }
    }

    const handleAddKeywords = (allLangs = false) => {
        const selectedBooksData = books.filter(b => selectedBooks.includes(b.id))
        const pNameAr = name || 'باقة كتب'
        const pNameFr = nameFr || name || 'Pack de livres'
        const pNameEn = nameEn || name || 'Book pack'

        const kwAr = getPackKeywords(pNameAr, selectedBooksData, 'ar')
        const kwFr = getPackKeywords(pNameFr, selectedBooksData, 'fr')
        const kwEn = getPackKeywords(pNameEn, selectedBooksData, 'en')

        if (allLangs) {
            setDescription(prev => appendKeywordsToDescription(prev, kwAr, 'ar'))
            setDescriptionFr(prev => appendKeywordsToDescription(prev, kwFr, 'fr'))
            setDescriptionEn(prev => appendKeywordsToDescription(prev, kwEn, 'en'))
            return
        }

        if (currentLang === 'ar') {
            setDescription(prev => appendKeywordsToDescription(prev, kwAr, 'ar'))
        } else if (currentLang === 'fr') {
            setDescriptionFr(prev => appendKeywordsToDescription(prev, kwFr, 'fr'))
        } else {
            setDescriptionEn(prev => appendKeywordsToDescription(prev, kwEn, 'en'))
        }
    }

    const generateDescription = () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) {
            alert('Veuillez d\'abord saisir un nom pour le pack.');
            return;
        }

        const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
        if (selectedBooksData.length === 0) {
            alert('Veuillez d\'abord sélectionner au moins un livre pour ce pack.');
            return;
        }

        const writtenByText = currentLang === 'ar' ? 'تأليف' : currentLang === 'en' ? 'written by' : 'écrit par';
        const booksListText = selectedBooksData.map(b => `- ${getBookDisplayTitle(b)} (${writtenByText} ${b.author})`).join('\n');
        
        let baseText = '';
        if (currentLang === 'ar') {
            baseText = `استفد من باقتنا الحصرية: "${packName}"!\n\nتحتوي هذه الباقة على الكتب التالية:\n${booksListText}\n\nاطلبها الآن بأفضل سعر!`;
            const kw = getPackKeywords(packName, selectedBooksData, 'ar');
            setDescription(appendKeywordsToDescription(baseText, kw, 'ar'));
        } else if (currentLang === 'fr') {
            baseText = `Profitez de notre pack exclusif : "${packName}" !\n\nCe pack contient les livres suivants :\n${booksListText}\n\nCommandez dès maintenant au meilleur prix !`;
            const kw = getPackKeywords(packName, selectedBooksData, 'fr');
            setDescriptionFr(appendKeywordsToDescription(baseText, kw, 'fr'));
        } else {
            baseText = `Enjoy our exclusive pack: "${packName}"!\n\nThis pack contains the following books:\n${booksListText}\n\nOrder now at the best price!`;
            const kw = getPackKeywords(packName, selectedBooksData, 'en');
            setDescriptionEn(appendKeywordsToDescription(baseText, kw, 'en'));
        }
    }

    const generateHighlightsAI = async () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) return alert('Veuillez saisir un nom pour le pack');
        
        const currentVal = (currentLang === 'ar' ? jumiaHighlightsAr : currentLang === 'fr' ? jumiaHighlightsFr : jumiaHighlightsEn).trim();
        
        if (!currentVal) {
            const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
            const lis = selectedBooksData.map(b => `<li>${getBookDisplayTitle(b)}</li>`).join('');
            let defaultText = '';
            if (currentLang === 'ar') {
                defaultText = `<ul><li>العنوان: ${packName}</li><li>النوع: باقة كتب</li>${lis ? `<li>الكتب المتضمنة:</li>${lis}` : ''}</ul>`;
                setJumiaHighlightsAr(defaultText);
            } else if (currentLang === 'en') {
                defaultText = `<ul><li>Title: ${packName}</li><li>Type: Book Pack</li>${lis ? `<li>Included books:</li>${lis}` : ''}</ul>`;
                setJumiaHighlightsEn(defaultText);
            } else {
                defaultText = `<ul><li>Titre: ${packName}</li><li>Type: Pack de Livres</li>${lis ? `<li>Contient:</li>${lis}` : ''}</ul>`;
                setJumiaHighlightsFr(defaultText);
            }
            return;
        }
        
        setIsGeneratingHighlights(true);
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'texts', texts: [currentVal], targetLang: currentLang === 'ar' ? 'AR' : currentLang === 'en' ? 'EN' : 'FR' })
            });
            const data = await res.json();
            if (data.success && data.translations && data.translations[0]) {
                if (currentLang === 'ar') setJumiaHighlightsAr(data.translations[0]);
                else if (currentLang === 'en') setJumiaHighlightsEn(data.translations[0]);
                else setJumiaHighlightsFr(data.translations[0]);
            } else if (data.error) {
                alert('Erreur DeepL: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la traduction');
        } finally {
            setIsGeneratingHighlights(false);
        }
    }

    const generateContentAI = async () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) return alert('Veuillez saisir un nom pour le pack');
        
        const currentVal = (currentLang === 'ar' ? jumiaPackageContentAr : currentLang === 'fr' ? jumiaPackageContentFr : jumiaPackageContentEn).trim();
        
        if (!currentVal) {
            const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
            const booksTitles = selectedBooksData.map(getBookDisplayTitle).join(', ');
            let defaultText = '';
            if (currentLang === 'ar') {
                defaultText = `1 x باقة كتب : ${packName}${booksTitles ? ` (${booksTitles})` : ''}`;
                setJumiaPackageContentAr(defaultText);
            } else if (currentLang === 'en') {
                defaultText = `1 x Book pack : ${packName}${booksTitles ? ` (${booksTitles})` : ''}`;
                setJumiaPackageContentEn(defaultText);
            } else {
                defaultText = `1 x Pack de livres : ${packName}${booksTitles ? ` (${booksTitles})` : ''}`;
                setJumiaPackageContentFr(defaultText);
            }
            return;
        }
        
        setIsGeneratingContent(true);
        try {
            const res = await fetch('/api/admin/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'texts', texts: [currentVal], targetLang: currentLang === 'ar' ? 'AR' : currentLang === 'en' ? 'EN' : 'FR' })
            });
            const data = await res.json();
            if (data.success && data.translations && data.translations[0]) {
                if (currentLang === 'ar') setJumiaPackageContentAr(data.translations[0]);
                else if (currentLang === 'en') setJumiaPackageContentEn(data.translations[0]);
                else setJumiaPackageContentFr(data.translations[0]);
            } else if (data.error) {
                alert('Erreur DeepL: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la traduction');
        } finally {
            setIsGeneratingContent(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (selectedBooks.length === 0) {
            setError('Veuillez sélectionner au moins un livre')
            setLoading(false)
            return
        }

        const formData = new FormData(e.currentTarget)

        const input: PackInput = {
            name,
            nameFr: nameFr || undefined,
            nameEn: nameEn || undefined,
            description: description || undefined,
            descriptionFr: descriptionFr || undefined,
            descriptionEn: descriptionEn || undefined,
            language: packLanguage,
            price: Math.round(parseFloat(formData.get('price') as string)),
            originalPrice: formData.get('originalPrice') ? Math.round(parseFloat(formData.get('originalPrice') as string)) : undefined,
            image: formData.get('image') as string || packImage || undefined,
            isFreeDelivery,
            shippingFees: isFreeDelivery ? 0 : shippingFees,
            bookIds: selectedBooks,
            extraProductIds: [],
            isAffiliate,
            affiliateLink: affiliateLink || undefined,
            sellerSku: formData.get('sellerSku') as string || undefined,
            jumiaHighlights: (currentLang === 'fr' ? jumiaHighlightsFr : currentLang === 'ar' ? jumiaHighlightsAr : jumiaHighlightsEn) || jumiaHighlightsFr || jumiaHighlightsAr || jumiaHighlightsEn || (formData.get('jumiaHighlights') as string) || undefined,
            jumiaHighlightsAr: jumiaHighlightsAr || undefined,
            jumiaHighlightsFr: jumiaHighlightsFr || undefined,
            jumiaHighlightsEn: jumiaHighlightsEn || undefined,
            jumiaPackageContent: (currentLang === 'fr' ? jumiaPackageContentFr : currentLang === 'ar' ? jumiaPackageContentAr : jumiaPackageContentEn) || jumiaPackageContentFr || jumiaPackageContentAr || jumiaPackageContentEn || (formData.get('jumiaPackageContent') as string) || undefined,
            jumiaPackageContentAr: jumiaPackageContentAr || undefined,
            jumiaPackageContentFr: jumiaPackageContentFr || undefined,
            jumiaPackageContentEn: jumiaPackageContentEn || undefined,
        }

        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        const action = submitter?.value || 'close'

        const result = await updatePack(pack.id, input)

        if (result.success) {
            if (action === 'close') {
                router.push('/admin/packs')
                router.refresh()
            } else if (action === 'push_to_jumia') {
                setLoading(false)
                setIsPushingJumia(true)
                try {
                    const res = await publishPacksToJumia([pack.id])
                    if (res.success) {
                        alert(res.message || 'Pack enregistré et publié avec succès sur Jumia')
                    } else {
                        alert('Erreur Jumia: ' + res.message)
                    }
                } catch {
                    alert('Erreur technique lors de la publication')
                } finally {
                    setIsPushingJumia(false)
                    router.refresh()
                }
            } else {
                setLoading(false)
                alert('Pack enregistré avec succès !')
                router.refresh()
            }
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    async function handleConfirmJumiaPush(pushLang: JumiaPushLanguage) {
        setIsPushingJumia(true)
        try {
            if (formRef.current) {
                const formData = new FormData(formRef.current)
                const priceVal = formData.get('price') ? Math.round(parseFloat(formData.get('price') as string)) : pack.price
                const originalPriceVal = formData.get('originalPrice') ? Math.round(parseFloat(formData.get('originalPrice') as string)) : undefined
                const skuVal = (formData.get('sellerSku') as string) || undefined

                const input: PackInput = {
                    name,
                    nameFr: nameFr || undefined,
                    nameEn: nameEn || undefined,
                    description: description || undefined,
                    descriptionFr: descriptionFr || undefined,
                    descriptionEn: descriptionEn || undefined,
                    language: packLanguage,
                    price: priceVal,
                    originalPrice: originalPriceVal,
                    image: (formData.get('image') as string) || packImage || undefined,
                    isFreeDelivery,
                    shippingFees: isFreeDelivery ? 0 : shippingFees,
                    bookIds: selectedBooks,
                    extraProductIds: [],
                    isAffiliate,
                    affiliateLink: affiliateLink || undefined,
                    sellerSku: skuVal,
                    jumiaHighlights: (currentLang === 'fr' ? jumiaHighlightsFr : currentLang === 'ar' ? jumiaHighlightsAr : jumiaHighlightsEn) || jumiaHighlightsFr || jumiaHighlightsAr || jumiaHighlightsEn || (formData.get('jumiaHighlights') as string) || undefined,
                    jumiaHighlightsAr: jumiaHighlightsAr || undefined,
                    jumiaHighlightsFr: jumiaHighlightsFr || undefined,
                    jumiaHighlightsEn: jumiaHighlightsEn || undefined,
                    jumiaPackageContent: (currentLang === 'fr' ? jumiaPackageContentFr : currentLang === 'ar' ? jumiaPackageContentAr : jumiaPackageContentEn) || jumiaPackageContentFr || jumiaPackageContentAr || jumiaPackageContentEn || (formData.get('jumiaPackageContent') as string) || undefined,
                    jumiaPackageContentAr: jumiaPackageContentAr || undefined,
                    jumiaPackageContentFr: jumiaPackageContentFr || undefined,
                    jumiaPackageContentEn: jumiaPackageContentEn || undefined,
                }
                await updatePack(pack.id, input)
            }

            const res = await publishPacksToJumia([pack.id], pushLang)
            if (res.success) {
                alert(res.message || 'Pack enregistré et publié avec succès sur Jumia !')
                setIsJumiaModalOpen(false)
                router.refresh()
            } else {
                alert('Erreur Jumia: ' + res.message)
            }
        } catch (err: any) {
            alert('Erreur technique lors de la publication: ' + (err.message || 'Échec'))
        } finally {
            setIsPushingJumia(false)
        }
    }

    const selectedBooksData = books.filter(b => selectedBooks.includes(b.id))
    const totalOriginalPrice = Math.round(selectedBooksData.reduce((sum, b) => sum + b.price, 0))

    const filteredBooks = books.filter(book => {
        const matchesSearch = getBookSearchTitles(book).some(title => title.includes(normalizeSearchText(searchQuery))) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesAvailability = onlyAvailable ? (book.active && book.stock > 0) : true
        const matchesAuthor = filterAuthor === 'ALL' || book.author?.trim() === filterAuthor
        const matchesCategory = filterCategory === 'ALL' || (book.category || 'Non catégorisé') === filterCategory
        const matchesLanguage = filterLanguage === 'ALL' || (book.language || 'fr') === filterLanguage
        
        return matchesSearch && matchesAvailability && matchesAuthor && matchesCategory && matchesLanguage
    })

    const authors = Array.from(new Set(books.map(b => b.author?.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const authorBookCounts = books.reduce((acc, b) => {
        const author = b.author?.trim()
        if (author) {
            acc[author] = (acc[author] || 0) + 1
        }
        return acc
    }, {} as Record<string, number>)
    const categories = Array.from(new Set(books.map(b => b.category || 'Non catégorisé'))).sort()
    const languages = Array.from(new Set(books.map(b => b.language || 'fr'))).sort()

    const groupedBooks = filteredBooks.reduce((acc, book) => {
        const category = book.category || 'Non catégorisé'
        if (!acc[category]) acc[category] = []
        acc[category].push(book)
        return acc
    }, {} as Record<string, typeof books>)

    // Onglets langue
    const langTabs = [
        { key: 'ar' as const, label: 'العربية', flag: '🇲🇦' },
        { key: 'fr' as const, label: 'Français', flag: '🇫🇷' },
        { key: 'en' as const, label: 'English', flag: '🇬🇧' },
    ]

    const copyChatGptPrompt = () => {
        const detectedLang = detectPackLanguage(selectedBooksData)
        const effectiveLang = packLanguage !== 'all' ? packLanguage : detectedLang
        const langLabel = effectiveLang === 'en' ? 'Anglais / English' : effectiveLang === 'ar' ? 'Arabe / Arabic' : effectiveLang === 'fr' ? 'Français / French' : 'Mixte'
        const arSuffix = getLanguageLabel(effectiveLang, 'ar')
        const frSuffix = getLanguageLabel(effectiveLang, 'fr')
        const enSuffix = getLanguageLabel(effectiveLang, 'en')

        const packName = name || nameFr || nameEn || 'Nom du pack inconnu'
        const selectedTitles = selectedBooksData.map(getBookDisplayTitle).join(', ')

        const prompt = `Act as an expert e-commerce copywriter & bookseller for Jumia marketplace.
Pack Name: ${packName}
Original Language of Books in this Pack: ${langLabel}
${selectedTitles ? `Books Included in this Pack (${selectedBooksData.length}): ${selectedTitles}` : ''}

CRITICAL TITLE INSTRUCTION:
Because buyers must know the original language of the books in this pack, you MUST explicitly mention the language at the end of each title:
- "name_ar": Must end with "${arSuffix}" (e.g. "اسم الباقة ${arSuffix}")
- "name_fr": Must end with "${frSuffix}" (e.g. "Nom du pack ${frSuffix}")
- "name_en": Must end with "${enSuffix}" (e.g. "Pack Name ${enSuffix}")

CRITICAL DESCRIPTION & SEO KEYWORDS INSTRUCTION:
For each language description ("description_ar", "description_fr", "description_en"), write 2 to 3 engaging paragraphs that highlight the reading experience and value of the pack.
AT THE VERY END OF EACH DESCRIPTION, YOU MUST ADD A HIGH-IMPACT SEO KEYWORDS BLOCK:
- In "description_ar", end with:
  الكلمات المفتاحية: [قائمة كلمات مفتاحية غنية بالبحث مفصولة بفواصل، تشمل اسم الكاتب، عناوين الروايات، تصنيف الروايات، شراء كتب في المغرب، باقة روايات]
- In "description_fr", end with:
  Mots-clés SEO : [liste de mots-clés riches en recherche séparés par des virgules, incluant auteur, titres des livres, genre littéraire, achat livres Maroc, pack de livres]
- In "description_en", end with:
  Keywords: [list of high-volume search keywords separated by commas, including author name, book titles, genre, books in Morocco, book bundle]

Please provide the following information in strict JSON format:
{
  "name_ar": "اسم الحزمة باللغة العربية متبوعاً بـ ${arSuffix}",
  "name_fr": "Nom du pack en français suivi de ${frSuffix}",
  "name_en": "Pack name in English followed by ${enSuffix}",
  "description_ar": "وصف جذاب للحزمة بالعربية (فقرتين إلى 3 فقرات تشجع على القراءة)\\n\\nالكلمات المفتاحية: [قائمة الكلمات المفتاحية بالعربية]",
  "description_fr": "Description engageante du pack en français (2 à 3 paragraphes)\\n\\nMots-clés SEO : [liste des mots-clés en français]",
  "description_en": "Engaging pack description in English (2-3 paragraphs)\\n\\nKeywords: [list of keywords in English]",
  "keywords_ar": "[قائمة الكلمات المفتاحية بالعربية]",
  "keywords_fr": "[liste des mots-clés en français]",
  "keywords_en": "[list of keywords in English]",
  "jumiaHighlights_ar": "<ul><li>العنوان: [اسم الحزمة بالعربية]</li><li>النوع: باقة كتب</li>${selectedTitles ? `<li>الكتب: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaHighlights_fr": "<ul><li>Titre: [Nom du pack en français]</li><li>Type: Pack de Livres</li>${selectedTitles ? `<li>Contient: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaHighlights_en": "<ul><li>Title: [Pack name in English]</li><li>Type: Book Pack</li>${selectedTitles ? `<li>Contains: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaPackageContent_ar": "1 x باقة كتب : [اسم الحزمة بالعربية ${arSuffix}]",
  "jumiaPackageContent_fr": "1 x Pack de livres : [Nom du pack en français ${frSuffix}]",
  "jumiaPackageContent_en": "1 x Book pack : [Pack name in English ${enSuffix}]",
  "jumiaHighlights": "<ul><li>Titre: [Nom du pack en français]</li><li>Type: Pack de Livres</li>${selectedTitles ? `<li>Contient: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaPackageContent": "1 x Pack de livres : [Nom du pack en français ${frSuffix}]"
}
Ensure all descriptions and highlights are formatted properly. Never use the vertical bar (|) in titles or descriptions (use hyphens - instead). HTML in highlights must use clean <ul> and <li> tags.`

        navigator.clipboard.writeText(prompt)
        alert('Prompt ChatGPT copié dans le presse-papier !')
    }

    const pasteChatGptResponse = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text) {
                alert('Presse-papier vide')
                return
            }
            
            // Extraction robuste du JSON (gère le code markdown ```json ... ``` ou texte autour)
            let jsonStr = text.trim()
            const matchCodeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
            if (matchCodeBlock) {
                jsonStr = matchCodeBlock[1].trim()
            } else {
                const firstBrace = text.indexOf('{')
                const lastBrace = text.lastIndexOf('}')
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonStr = text.substring(firstBrace, lastBrace + 1)
                }
            }

            let data: any
            try {
                data = JSON.parse(jsonStr)
            } catch (e) {
                alert('Le contenu du presse-papier n\'est pas un JSON valide.')
                return
            }

            // Détection de la langue du pack
            const detectedLang = detectPackLanguage(selectedBooksData)
            const effectiveLang = packLanguage !== 'all' ? packLanguage : detectedLang
            if (effectiveLang !== 'all') {
                setPackLanguage(effectiveLang)
            }

            // Noms
            const nAr = data.name_ar || data.nameAr || data.title_ar || data.titleAr
            const nFr = data.name_fr || data.nameFr || data.title_fr || data.titleFr
            const nEn = data.name_en || data.nameEn || data.title_en || data.titleEn
            if (nAr) setName(appendLanguageSuffix(nAr, effectiveLang, 'ar'))
            if (nFr) setNameFr(appendLanguageSuffix(nFr, effectiveLang, 'fr'))
            if (nEn) setNameEn(appendLanguageSuffix(nEn, effectiveLang, 'en'))

            // Descriptions & Mots-clés SEO
            let dAr = data.description_ar || data.descriptionAr || ''
            let dFr = data.description_fr || data.descriptionFr || ''
            let dEn = data.description_en || data.descriptionEn || ''

            const kwAr = data.keywords_ar || data.keywordsAr || data.tags_ar || ''
            const kwFr = data.keywords_fr || data.keywordsFr || data.tags_fr || ''
            const kwEn = data.keywords_en || data.keywordsEn || data.tags_en || ''

            if (kwAr && dAr && !dAr.includes('الكلمات المفتاحية') && !dAr.includes('كلمات مفتاحية')) {
                const kwStr = Array.isArray(kwAr) ? kwAr.join(', ') : String(kwAr)
                dAr = `${dAr.trim()}\n\nالكلمات المفتاحية: ${kwStr}`
            }
            if (kwFr && dFr && !dFr.toLowerCase().includes('mots-clés') && !dFr.toLowerCase().includes('mots clés')) {
                const kwStr = Array.isArray(kwFr) ? kwFr.join(', ') : String(kwFr)
                dFr = `${dFr.trim()}\n\nMots-clés SEO : ${kwStr}`
            }
            if (kwEn && dEn && !dEn.toLowerCase().includes('keywords:')) {
                const kwStr = Array.isArray(kwEn) ? kwEn.join(', ') : String(kwEn)
                dEn = `${dEn.trim()}\n\nKeywords: ${kwStr}`
            }

            // Fallback automatique si aucun mot-clé n'a été inséré
            if (dAr && !dAr.includes('الكلمات المفتاحية') && !dAr.includes('كلمات مفتاحية')) {
                const kw = getPackKeywords(nAr || name || 'باقة كتب', selectedBooksData, 'ar')
                dAr = appendKeywordsToDescription(dAr, kw, 'ar')
            }
            if (dFr && !dFr.toLowerCase().includes('mots-clés') && !dFr.toLowerCase().includes('mots clés')) {
                const kw = getPackKeywords(nFr || nameFr || name || 'Pack de livres', selectedBooksData, 'fr')
                dFr = appendKeywordsToDescription(dFr, kw, 'fr')
            }
            if (dEn && !dEn.toLowerCase().includes('keywords:')) {
                const kw = getPackKeywords(nEn || nameEn || name || 'Book pack', selectedBooksData, 'en')
                dEn = appendKeywordsToDescription(dEn, kw, 'en')
            }

            if (dAr) setDescription(dAr)
            if (dFr) setDescriptionFr(dFr)
            if (dEn) setDescriptionEn(dEn)

            // Multilingual Jumia Highlights
            const hAr = data.jumiaHighlights_ar || data.jumia_highlights_ar || data.highlights_ar || data.highlightsAr || (data.jumiaHighlights && /[\u0600-\u06FF]/.test(data.jumiaHighlights) ? data.jumiaHighlights : '')
            const hFr = data.jumiaHighlights_fr || data.jumia_highlights_fr || data.highlights_fr || data.highlightsFr || data.jumiaHighlights || data.highlights || ''
            const hEn = data.jumiaHighlights_en || data.jumia_highlights_en || data.highlights_en || data.highlightsEn || ''
            if (hAr) setJumiaHighlightsAr(hAr)
            if (hFr) setJumiaHighlightsFr(hFr)
            if (hEn) setJumiaHighlightsEn(hEn)

            // Multilingual Jumia Package Content
            const cAr = data.jumiaPackageContent_ar || data.jumia_package_content_ar || data.package_content_ar || data.packageContentAr || (data.jumiaPackageContent && /[\u0600-\u06FF]/.test(data.jumiaPackageContent) ? data.jumiaPackageContent : '')
            const cFr = data.jumiaPackageContent_fr || data.jumia_package_content_fr || data.package_content_fr || data.packageContentFr || data.jumiaPackageContent || data.package_content || ''
            const cEn = data.jumiaPackageContent_en || data.jumia_package_content_en || data.package_content_en || data.packageContentEn || ''
            if (cAr) setJumiaPackageContentAr(appendLanguageSuffix(cAr, effectiveLang, 'ar'))
            if (cFr) setJumiaPackageContentFr(appendLanguageSuffix(cFr, effectiveLang, 'fr'))
            if (cEn) setJumiaPackageContentEn(appendLanguageSuffix(cEn, effectiveLang, 'en'))

            alert('Champs et données Jumia remplis avec succès pour toutes les langues !')
        } catch (err) {
            console.error(err)
            alert('Erreur lors de la lecture du presse-papier. Vérifiez les autorisations.')
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/packs" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Modifier le pack</h1>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                        <span className="text-sm font-medium text-gray-500">État du Pack :</span>
                        {selectedBooksData.length === 0 ? (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200">Vide</span>
                        ) : selectedBooksData.some(b => b.stock <= 0) ? (
                            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Incomplet ({selectedBooksData.filter(b => b.stock <= 0).length} livre(s) en rupture)
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Complet
                            </span>
                        )}
                    </div>
                    {pack.sellerSku && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${isLinked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {isLinked ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Lié à Jumia
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-4 h-4" />
                                    Non Linké
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-600">
                        Modifiez les informations du pack &quot;{pack.name}&quot;
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <button
                            type="button"
                            onClick={copyChatGptPrompt}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <Bot className="w-5 h-5" />
                            Prompt ChatGPT
                        </button>
                        <button
                            type="button"
                            onClick={pasteChatGptResponse}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <ClipboardPaste className="w-5 h-5" />
                            Coller réponse
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Saisie Rapide Pack & Livres */}
            <div className="mb-6 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                            <Zap className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            Saisie Rapide (Nom du Pack + Livres)
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Auto-remplissage
                        </span>
                    </div>
                    {quickInput && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuickInput('')
                                setQuickInputResult(null)
                            }}
                            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            Effacer
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-600 mb-3">
                    Collez ou saisissez votre ligne au format : <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-700 font-mono text-[11px] border border-blue-100">Nom du pack [TAB ou :] Livre 1 + Livre 2 + Livre 3</code>
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={quickInput}
                            onChange={e => setQuickInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleApplyQuickInput()
                                }
                            }}
                            placeholder="Ex: Pack Change Ta Vie	العادات الذرية + قوة العادات + The Mountain Is You"
                            className="w-full px-4 py-2.5 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner font-sans"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleApplyQuickInput}
                        disabled={!quickInput.trim()}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                    >
                        <Zap className="w-4 h-4" />
                        Remplir & Sélectionner
                    </button>
                </div>

                {/* Résultat / Feedback */}
                {quickInputResult && (
                    <div className="mt-4 pt-3 border-t border-blue-200/60 text-xs space-y-2">
                        {quickInputResult.packName && (
                            <div className="flex items-center gap-2 text-gray-700">
                                <span className="font-semibold text-gray-900">Nom appliqué :</span>
                                <span className="px-2 py-0.5 bg-white rounded border border-gray-200 font-medium text-blue-900">
                                    {quickInputResult.packName}
                                </span>
                            </div>
                        )}

                        {quickInputResult.matched.length > 0 && (
                            <div>
                                <span className="font-semibold text-green-800">
                                    Livres sélectionnés ({quickInputResult.matched.length}) :
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {quickInputResult.matched.map(m => (
                                        <span
                                            key={m.id}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-900 rounded-md font-medium text-[11px] border border-green-200"
                                        >
                                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                                            {m.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {quickInputResult.notFound.length > 0 && (
                            <div>
                                <span className="font-semibold text-amber-800">
                                    Non trouvés ({quickInputResult.notFound.length}) :
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {quickInputResult.notFound.map((token, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md font-medium text-[11px] border border-amber-200"
                                        >
                                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                                            {token}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-6">
                    {/* Pack Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Informations du Pack</h2>
                            {/* Onglets langue */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                {langTabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setCurrentLang(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentLang === tab.key ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <span>{tab.flag}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bouton traduction */}
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                type="button"
                                onClick={handleAutoTranslate}
                                disabled={isTranslating}
                                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                                {isTranslating ? 'Traduction...' : 'Traduire avec DeepL (AR → FR + EN)'}
                            </button>
                            {translateMsg && (
                                <span className={`text-xs px-2 py-1 rounded ${translateMsg.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                    {translateMsg}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Nom */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nom du pack {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'} <span className="text-red-500">*</span>
                                </label>
                                {currentLang === 'ar' && (
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="اسم الحزمة"
                                        dir="rtl"
                                    />
                                )}
                                {currentLang === 'fr' && (
                                    <input
                                        type="text"
                                        value={nameFr}
                                        onChange={e => setNameFr(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nom du pack en français"
                                    />
                                )}
                                {currentLang === 'en' && (
                                    <input
                                        type="text"
                                        value={nameEn}
                                        onChange={e => setNameEn(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Pack name in English"
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAddKeywords(false)}
                                            className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-all bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100"
                                            title="Ajouter les mots-clés SEO à la description active"
                                        >
                                            🏷️ + Mots-clés SEO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={generateDescription}
                                            className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100"
                                        >
                                            ✨ Générer la description
                                        </button>
                                    </div>
                                </div>
                                {currentLang === 'ar' && (
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="وصف الحزمة..."
                                        dir="rtl"
                                    />
                                )}
                                {currentLang === 'fr' && (
                                    <textarea
                                        rows={3}
                                        value={descriptionFr}
                                        onChange={e => setDescriptionFr(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Description du pack en français..."
                                    />
                                )}
                                {currentLang === 'en' && (
                                    <textarea
                                        rows={3}
                                        value={descriptionEn}
                                        onChange={e => setDescriptionEn(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Pack description in English..."
                                    />
                                )}
                            </div>

                            {/* Langue du Pack */}
                            <fieldset>
                                <legend className="block text-sm font-medium text-gray-700 mb-2">
                                    Langue du Pack
                                </legend>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                        <input
                                            type="radio"
                                            name="language"
                                            value="all"
                                            checked={packLanguage === 'all'}
                                            onChange={() => {
                                                setPackLanguage('all')
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900">All</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                        <input
                                            type="radio"
                                            name="language"
                                            value="fr"
                                            checked={packLanguage === 'fr'}
                                            onChange={() => {
                                                setPackLanguage('fr')
                                                setCurrentLang('fr')
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900">Français</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                        <input
                                            type="radio"
                                            name="language"
                                            value="ar"
                                            checked={packLanguage === 'ar'}
                                            onChange={() => {
                                                setPackLanguage('ar')
                                                setCurrentLang('ar')
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900">Arabe</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                                        <input
                                            type="radio"
                                            name="language"
                                            value="en"
                                            checked={packLanguage === 'en'}
                                            onChange={() => {
                                                setPackLanguage('en')
                                                setCurrentLang('en')
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900">Anglais</span>
                                    </label>
                                </div>
                            </fieldset>

                            {/* Prix barré */}
                            <div>
                                <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prix de vente (درهم) <span className="text-gray-400 text-xs">(Optionnel, affiché barré)</span>
                                </label>
                                <input
                                    type="number"
                                    id="originalPrice"
                                    name="originalPrice"
                                    min="0"
                                    step="1"
                                    defaultValue={pack.originalPrice ? Math.round(pack.originalPrice) : ''}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="500"
                                />
                                {selectedBooks.length > 0 && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Prix total des livres sélectionnés: <span className="font-medium">{totalOriginalPrice} درهم</span>
                                    </p>
                                )}
                            </div>

                            {/* Prix promo */}
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prix de promotion (درهم) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    required
                                    min="0"
                                    step="1"
                                    defaultValue={Math.round(pack.price)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="450"
                                />
                            </div>

                            {/* Seller SKU */}
                            <div>
                                <label htmlFor="sellerSku" className="block text-sm font-medium text-gray-700 mb-2">
                                    Seller SKU (Jumia)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id="sellerSku"
                                        name="sellerSku"
                                        defaultValue={pack.sellerSku || ''}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="SKU vendeur pour synchronisation"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('sellerSku') as HTMLInputElement
                                            if (input) input.value = `RIW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                                    >
                                        Générer
                                    </button>
                                </div>
                            </div>

                            {/* Image */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <label className="block text-sm font-medium text-gray-700">Image du pack</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setMediaModalTab('books'); setIsMediaModalOpen(true); }}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                                        >
                                            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                            depuis Médiathèque
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setMediaModalTab('marketing'); setIsMediaModalOpen(true); }}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                            depuis Créatives Marketing
                                        </button>
                                    </div>
                                </div>
                                <ImageInput defaultValue={packImage} bookTitle={pack.name} />
                            </div>

                            {/* Livraison */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isFreeDelivery"
                                            checked={isFreeDelivery}
                                            onChange={e => setIsFreeDelivery(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="isFreeDelivery" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Livraison gratuite
                                        </label>
                                    </div>
                                    {isFreeDelivery ? (
                                        <span className="text-2xl">🚚 <span className="text-xs font-black text-green-500">GRATUITE</span></span>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <label htmlFor="shippingFees" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                Frais de livraison
                                            </label>
                                            <select aria-label="Sélection shippingFees"
                                                id="shippingFees"
                                                value={shippingFees}
                                                onChange={e => setShippingFees(Number(e.target.value))}
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                            >
                                                {[20, 30, 35, 40, 45].map(fee => (
                                                    <option key={fee} value={fee}>{fee} درهم</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amazon Affiliate */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isAffiliate"
                                            checked={isAffiliate}
                                            onChange={e => setIsAffiliate(e.target.checked)}
                                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="isAffiliate" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
                                            Lien d'affiliation Amazon
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Affiliation</span>
                                        </label>
                                    </div>
                                    
                                    {isAffiliate && (
                                        <div className="pl-7 space-y-2">
                                            <label htmlFor="affiliateLink" className="block text-xs font-bold text-gray-600 uppercase">
                                                URL du produit Amazon (Associate Link)
                                            </label>
                                            <input
                                                type="url"
                                                id="affiliateLink"
                                                value={affiliateLink}
                                                onChange={e => setAffiliateLink(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                                placeholder="https://amzn.to/..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Jumia Highlights */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="jumiaHighlights" className="block text-sm font-medium text-gray-700">
                                        Highlights Jumia (Description courte HTML) {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'}
                                    </label>
                                    <button type="button" onClick={generateHighlightsAI} disabled={isGeneratingHighlights} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                        {isGeneratingHighlights ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL'}
                                    </button>
                                </div>
                                <textarea
                                    id="jumiaHighlights"
                                    name="jumiaHighlights"
                                    rows={3}
                                    dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
                                    value={currentLang === 'ar' ? jumiaHighlightsAr : currentLang === 'fr' ? jumiaHighlightsFr : jumiaHighlightsEn}
                                    onChange={e => {
                                        if (currentLang === 'ar') setJumiaHighlightsAr(e.target.value)
                                        else if (currentLang === 'fr') setJumiaHighlightsFr(e.target.value)
                                        else setJumiaHighlightsEn(e.target.value)
                                    }}
                                    placeholder={currentLang === 'ar' 
                                        ? `<ul><li>العنوان: ${name || pack.name}</li><li>النوع: باقة كتب</li></ul>`
                                        : currentLang === 'en'
                                        ? `<ul><li>Title: ${nameEn || name || pack.name}</li><li>Type: Book Pack</li></ul>`
                                        : `<ul><li>Titre: ${nameFr || name || pack.name}</li><li>Type: Pack de Livres</li></ul>`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Laisser vide pour utiliser la valeur par défaut. Recommandé : une liste HTML.
                                </p>
                            </div>

                            {/* Jumia Package Content */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="jumiaPackageContent" className="block text-sm font-medium text-gray-700">
                                        Contenu du colis Jumia (What's in the box) {currentLang === 'ar' ? '(Arabe)' : currentLang === 'fr' ? '(Français)' : '(Anglais)'}
                                    </label>
                                    <button type="button" onClick={generateContentAI} disabled={isGeneratingContent} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                        {isGeneratingContent ? <Loader2 className="w-4 h-4 animate-spin"/> : '✨ DEEPL'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    id="jumiaPackageContent"
                                    name="jumiaPackageContent"
                                    dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
                                    value={currentLang === 'ar' ? jumiaPackageContentAr : currentLang === 'fr' ? jumiaPackageContentFr : jumiaPackageContentEn}
                                    onChange={e => {
                                        if (currentLang === 'ar') setJumiaPackageContentAr(e.target.value)
                                        else if (currentLang === 'fr') setJumiaPackageContentFr(e.target.value)
                                        else setJumiaPackageContentEn(e.target.value)
                                    }}
                                    placeholder={currentLang === 'ar' 
                                        ? `1 x باقة كتب : ${name || pack.name}`
                                        : currentLang === 'en'
                                        ? `1 x Book pack : ${nameEn || name || pack.name}`
                                        : `1 x Pack de livres : ${nameFr || name || pack.name}`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Exemple: "3 x Livres". Laisser vide pour la valeur par défaut.
                                </p>
                            </div>

                            {/* Prévisualisation Comparative Multilingue Jumia */}
                            <div className="mt-6 border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 rounded-xl p-4 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-wider">
                                            Jumia Sync
                                        </span>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                            Aperçu Comparatif Multilingue (AR / FR / EN)
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-gray-500">
                                        Cliquez sur une langue pour basculer l'édition
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                    <table className="min-w-full text-xs divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-32">
                                                    Attribut
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentLang('ar')}
                                                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${currentLang === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                                    >
                                                        العربية (AR) {currentLang === 'ar' ? '✓' : ''}
                                                    </button>
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-left">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentLang('fr')}
                                                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${currentLang === 'fr' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                                    >
                                                        Français (FR) {currentLang === 'fr' ? '✓' : ''}
                                                    </button>
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-left">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentLang('en')}
                                                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${currentLang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                                    >
                                                        English (EN) {currentLang === 'en' ? '✓' : ''}
                                                    </button>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {/* Titre */}
                                            <tr className="hover:bg-gray-50/50">
                                                <td className="px-3 py-2.5 font-semibold text-gray-700 bg-gray-50/40">
                                                    Titre
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-medium text-gray-900" dir="rtl">
                                                    {name ? (
                                                        <span>{name} <span className="text-[10px] text-gray-400 font-normal">({name.length}/60)</span></span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Non défini</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-gray-900">
                                                    {nameFr || name ? (
                                                        <span>{nameFr || name} <span className="text-[10px] text-gray-400 font-normal">({(nameFr || name).length}/60)</span></span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Non défini</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-gray-900">
                                                    {nameEn || name ? (
                                                        <span>{nameEn || name} <span className="text-[10px] text-gray-400 font-normal">({(nameEn || name).length}/60)</span></span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Non défini</span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Highlights */}
                                            <tr className="hover:bg-gray-50/50">
                                                <td className="px-3 py-2.5 font-semibold text-gray-700 bg-gray-50/40">
                                                    Highlights HTML
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-gray-700" dir="rtl">
                                                    {jumiaHighlightsAr ? (
                                                        <span className="line-clamp-2">{jumiaHighlightsAr}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Par défaut</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-mono text-[11px] text-gray-700">
                                                    {jumiaHighlightsFr ? (
                                                        <span className="line-clamp-2">{jumiaHighlightsFr}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Par défaut</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-mono text-[11px] text-gray-700">
                                                    {jumiaHighlightsEn ? (
                                                        <span className="line-clamp-2">{jumiaHighlightsEn}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Par défaut</span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Contenu colis */}
                                            <tr className="hover:bg-gray-50/50">
                                                <td className="px-3 py-2.5 font-semibold text-gray-700 bg-gray-50/40">
                                                    What's in the box
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-gray-800" dir="rtl">
                                                    {jumiaPackageContentAr ? (
                                                        <span>{jumiaPackageContentAr}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                            1 x باقة كتب : {name || '...'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-gray-800">
                                                    {jumiaPackageContentFr ? (
                                                        <span>{jumiaPackageContentFr}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                            1 x Pack de livres : {nameFr || name || '...'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-gray-800">
                                                    {jumiaPackageContentEn ? (
                                                        <span>{jumiaPackageContentEn}</span>
                                                    ) : (
                                                        <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                            1 x Book pack : {nameEn || name || '...'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sélection des livres */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Sélectionner les livres ({selectedBooks.length} sélectionné{selectedBooks.length > 1 ? 's' : ''})
                                </h2>
                                <div className="flex items-center gap-4 mt-1">
                                    <button type="button" onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        {selectedBooks.length === books.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer group ml-4">
                                        <div className="relative">
                                            <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="sr-only peer" />
                                            <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Disponible</span>
                                    </label>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="ALL">Toutes les catégories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="ALL">Tous les auteurs ({books.length})</option>
                                {authors.map(a => <option key={a} value={a}>{a} ({authorBookCounts[a] || 0})</option>)}
                            </select>
                            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="ALL">Toutes les langues</option>
                                {languages.map(l => <option key={l} value={l}>{l === 'ar' ? 'Arabe' : l === 'fr' ? 'Français' : l === 'en' ? 'Anglais' : l}</option>)}
                            </select>
                        </div>
                        <div className="max-h-96 overflow-y-auto pr-2">
                            {Object.entries(groupedBooks).length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Aucun livre trouvé</p>
                            ) : (
                                Object.entries(groupedBooks).map(([category, categoryBooks]) => (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                {category} ({categoryBooks.length})
                                            </h3>
                                            <button type="button" onClick={() => toggleAllInCategory(categoryBooks)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                                {categoryBooks.every(b => selectedBooks.includes(b.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {categoryBooks.map(book => (
                                                <label
                                                    key={book.id}
                                                    className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedBooks.includes(book.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBooks.includes(book.id)}
                                                        onChange={() => toggleBook(book.id)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500"
                                                    />
                                                    <div className="ml-4 flex-1">
                                                        <p className="text-sm font-black text-gray-900 leading-tight">
                                                            {getBookDisplayTitle(book)}
                                                            {!book.active && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded">Inactif</span>}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                            {book.author}
                                                            <span className={`ml-3 ${book.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>Stock: {book.stock}</span>
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-black text-black ml-2">{Math.round(book.price)} درهم</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                        {packImage && (
                            <div className="mb-6 flex justify-center">
                                <img src={packImage} alt="Pack" className="w-full max-w-sm rounded-lg shadow-sm border border-gray-100 object-cover" />
                            </div>
                        )}
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h2>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Livres sélectionnés:</span>
                                <span className="font-medium">{selectedBooks.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Prix total livres:</span>
                                <span className="font-medium">{totalOriginalPrice} درهم</span>
                            </div>
                        </div>

                        {selectedBooksData.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm font-medium text-gray-700 mb-2">Livres inclus:</p>
                                <ul className="space-y-1">
                                    {selectedBooksData.map(book => (
                                        <li key={book.id} className="text-xs text-gray-600 flex justify-between border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                                            <span className="truncate pr-2">• {getBookDisplayTitle(book)}</span>
                                            <span className={`font-semibold whitespace-nowrap ${book.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Qté: {book.stock}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    value="save"
                                    disabled={loading || selectedBooks.length === 0 || isPushingJumia}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {loading ? '...' : 'Enregistrer'}
                                </button>
                                <button
                                    type="submit"
                                    value="close"
                                    disabled={loading || selectedBooks.length === 0 || isPushingJumia}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {loading ? '...' : 'Enregistrer et fermer'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsJumiaModalOpen(true)}
                                    disabled={isPushingJumia || loading}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                                >
                                    {isPushingJumia ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                    Push to Jumia
                                </button>
                            <button
                                type="button"
                                onClick={() => setCreativeFormat('post')}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                ✨ Générer Post (FB/Insta)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreativeFormat('story')}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                            >
                                ✨ Générer Story (FB/Insta)
                            </button>
                            <Link href="/admin/packs" className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                                Annuler
                            </Link>
                        </div>
                    </div>
                </div>
            </form>

            <PackCreativeModal
                isOpen={creativeFormat !== null}
                onClose={() => setCreativeFormat(null)}
                format={creativeFormat!}
                onImageGenerated={url => { setPackImage(url); setCreativeFormat(null) }}
                pack={{ ...pack, name, description, books: selectedBooksData, whatsappNumber: whatsappPhone }}
            />

            <CatalogImageModal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                onSelect={url => { setPackImage(url); setIsCatalogOpen(false) }}
            />

            <MediaLibraryModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                initialTab={mediaModalTab}
                onSelect={(url) => {
                    setPackImage(url)
                    setIsMediaModalOpen(false)
                }}
            />

            <JumiaPushModal
                isOpen={isJumiaModalOpen}
                onClose={() => setIsJumiaModalOpen(false)}
                onConfirm={handleConfirmJumiaPush}
                isLoading={isPushingJumia}
            />
        </div>
    )
}
