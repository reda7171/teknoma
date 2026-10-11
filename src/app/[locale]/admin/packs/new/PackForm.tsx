'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, ImageIcon, Wand2, Languages, AlertTriangle, CheckCircle2, Bot, ClipboardPaste, Zap, X } from 'lucide-react'
import { createPack, type PackInput } from '@/lib/actions/packs'
import PackCreativeModal from '@/components/admin/PackCreativeModal'
import ImageInput from '@/components/admin/ImageInput'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import CatalogImageModal from '@/components/admin/CatalogImageModal'

interface Book {
    id: string
    title: string
    author: string
    price: number
    image?: string
    category?: string | null
    language?: string
    active: boolean
    stock: number
    itemType: 'BOOK' | 'ACCESSORY'
}

interface PackFormProps {
    books: Book[]
    whatsappPhone?: string
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

export default function PackForm({ books, whatsappPhone }: PackFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [creativeFormat, setCreativeFormat] = useState<'post' | 'story' | null>(null)
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    const [mediaModalTab, setMediaModalTab] = useState<'marketing' | 'books'>('books')
    const [selectedBooks, setSelectedBooks] = useState<string[]>([])
    const [isFreeDelivery, setIsFreeDelivery] = useState(false)
    const [shippingFees, setShippingFees] = useState(30)
    const [searchQuery, setSearchQuery] = useState('')
    const [onlyAvailable, setOnlyAvailable] = useState(true)
    const [filterAuthor, setFilterAuthor] = useState('ALL')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterLanguage, setFilterLanguage] = useState('ALL')
    const [isCatalogOpen, setIsCatalogOpen] = useState(false)
    const [packImage, setPackImage] = useState<string | undefined>(undefined)
    const [originalPrice, setOriginalPrice] = useState('')
    const [promotionPrice, setPromotionPrice] = useState('')
    const [sellerSku, setSellerSku] = useState('')

    // Champs multilingues
    const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>('ar')
    const [packLanguage, setPackLanguage] = useState<'ar' | 'fr' | 'en' | 'all'>('fr')
    const [name, setName] = useState('')
    const [nameFr, setNameFr] = useState('')
    const [nameEn, setNameEn] = useState('')
    const [description, setDescription] = useState('')
    const [descriptionFr, setDescriptionFr] = useState('')
    const [descriptionEn, setDescriptionEn] = useState('')
    const [jumiaHighlightsAr, setJumiaHighlightsAr] = useState('')
    const [jumiaHighlightsFr, setJumiaHighlightsFr] = useState('')
    const [jumiaHighlightsEn, setJumiaHighlightsEn] = useState('')
    const [jumiaPackageContentAr, setJumiaPackageContentAr] = useState('')
    const [jumiaPackageContentFr, setJumiaPackageContentFr] = useState('')
    const [jumiaPackageContentEn, setJumiaPackageContentEn] = useState('')
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

                let found = books.find(b => normalizeSearchText(b.title) === nt)

                if (!found) {
                    found = books.find(b => normalizeSearchText(b.title).startsWith(nt))
                }

                if (!found) {
                    found = books.find(b => {
                        const nb = normalizeSearchText(b.title)
                        return nb.includes(nt) || nt.includes(nb)
                    })
                }

                if (!found) {
                    const words = nt.split(' ').filter(w => w.length > 1)
                    if (words.length > 0) {
                        found = books.find(b => {
                            const nb = normalizeSearchText(`${b.title} ${b.author}`)
                            return words.every(w => nb.includes(w))
                        })
                    }
                }

                if (found) {
                    matched.push({ token, title: found.title, id: found.id })
                    matchedIds.push(found.id)
                } else {
                    notFound.push(token)
                }
            })

            if (matchedIds.length > 0) {
                setSelectedBooks(prev => Array.from(new Set([...prev, ...matchedIds])))
            }
        }

        setQuickInputResult({ packName, matched, notFound })
    }

    function toggleBook(bookId: string) {
        setSelectedBooks(prev =>
            prev.includes(bookId)
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId]
        )
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

    const generateDescription = () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) {
            alert('Veuillez d\'abord saisir un nom pour le pack.');
            return;
        }

        const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
        if (selectedBooksData.length === 0) {
            alert('Veuillez d\'abord sélectionner au moins un produit pour ce pack.');
            return;
        }

        const writtenByText = currentLang === 'ar' ? 'تأليف' : currentLang === 'en' ? 'written by' : 'écrit par';
        const accessoryText = currentLang === 'ar' ? 'إكسسوار' : currentLang === 'en' ? 'accessory' : 'accessoire';
        const booksListText = selectedBooksData.map(item =>
            item.itemType === 'BOOK'
                ? `- ${item.title} (${writtenByText} ${item.author})`
                : `- ${item.title} (${accessoryText})`
        ).join('\n');
        
        let generatedText = '';
        if (currentLang === 'ar') {
            generatedText = `استفد من باقتنا الحصرية: "${packName}"!\n\nتحتوي هذه الباقة على المنتجات التالية:\n${booksListText}\n\nاطلبها الآن بأفضل سعر!`;
            setDescription(generatedText);
        } else if (currentLang === 'fr') {
            generatedText = `Profitez de notre pack exclusif : "${packName}" !\n\nCe pack contient les produits suivants :\n${booksListText}\n\nCommandez dès maintenant au meilleur prix !`;
            setDescriptionFr(generatedText);
        } else {
            generatedText = `Enjoy our exclusive pack: "${packName}"!\n\nThis pack contains the following products:\n${booksListText}\n\nOrder now at the best price!`;
            setDescriptionEn(generatedText);
        }
    }

    const generateHighlightsAI = async () => {
        const packName = currentLang === 'ar' ? name : currentLang === 'fr' ? (nameFr || name) : (nameEn || name);
        if (!packName) return alert('Veuillez saisir un nom pour le pack');
        
        const currentVal = (currentLang === 'ar' ? jumiaHighlightsAr : currentLang === 'fr' ? jumiaHighlightsFr : jumiaHighlightsEn).trim();
        
        if (!currentVal) {
            const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));
            const lis = selectedBooksData.map(b => `<li>${b.title}</li>`).join('');
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
            const booksTitles = selectedBooksData.map(b => b.title).join(', ');
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
            setError('Veuillez sélectionner au moins un produit')
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
            bookIds: selectedBooksData.filter(item => item.itemType === 'BOOK').map(item => item.id),
            extraProductIds: selectedBooksData.filter(item => item.itemType === 'ACCESSORY').map(item => item.id),
            sellerSku: formData.get('sellerSku') as string || undefined,
            jumiaHighlights: (currentLang === 'fr' ? jumiaHighlightsFr : currentLang === 'ar' ? jumiaHighlightsAr : jumiaHighlightsEn) || jumiaHighlightsFr || jumiaHighlightsAr || jumiaHighlightsEn || (formData.get('jumiaHighlights') as string) || undefined,
            jumiaPackageContent: (currentLang === 'fr' ? jumiaPackageContentFr : currentLang === 'ar' ? jumiaPackageContentAr : jumiaPackageContentEn) || jumiaPackageContentFr || jumiaPackageContentAr || jumiaPackageContentEn || (formData.get('jumiaPackageContent') as string) || undefined,
        }

        const result = await createPack(input)

        if (result.success) {
            router.push('/admin/packs')
            router.refresh()
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    const selectedBooksData = books.filter(b => selectedBooks.includes(b.id))
    const totalOriginalPrice = Math.round(selectedBooksData.reduce((sum, b) => sum + b.price, 0))

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

    const langTabs = [
        { key: 'ar' as const, label: 'العربية', flag: '🇲🇦' },
        { key: 'fr' as const, label: 'Français', flag: '🇫🇷' },
        { key: 'en' as const, label: 'English', flag: '🇬🇧' },
    ]

    const copyChatGptPrompt = () => {
        if (selectedBooksData.length === 0) {
            setError('Veuillez sélectionner au moins un produit avant de générer le prompt ChatGPT.')
            return
        }

        setError(null)
        const packName = name || nameFr || nameEn || 'Nom du pack inconnu'
        const selectedTitles = selectedBooksData.map(item => `${item.title} (${item.itemType === 'BOOK' ? 'Book' : 'Accessory'})`).join(', ')

        const prompt = `Act as an expert e-commerce copywriter & bookseller for Jumia marketplace.
Pack Name: ${packName}
${selectedTitles ? `Products Included in this Pack (${selectedBooksData.length}): ${selectedTitles}` : ''}
Total retail price of all selected products: ${totalOriginalPrice} MAD.
Suggest an attractive promotional price below the total retail price. Prices must be whole numbers in MAD.
Generate one concise, unique Seller SKU usable on Jumia. The SKU must contain only uppercase letters, numbers and hyphens.

Please provide the following information in strict JSON format:
{
  "name_ar": "اسم الحزمة باللغة العربية (جذاب وواضح)",
  "name_fr": "Nom du pack en français (accrocheur et clair)",
  "name_en": "Pack name in English (catchy and professional)",
  "description_ar": "وصف جذاب للحزمة بالعربية (فقرتين إلى 3 فقرات تشجع على القراءة)",
  "description_fr": "Description engageante du pack en français (2 à 3 paragraphes)",
  "description_en": "Engaging pack description in English (2-3 paragraphs)",
  "jumiaHighlights_ar": "<ul><li>العنوان: [اسم الحزمة بالعربية]</li><li>النوع: باقة كتب</li>${selectedTitles ? `<li>الكتب: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaHighlights_fr": "<ul><li>Titre: [Nom du pack en français]</li><li>Type: Pack de Livres</li>${selectedTitles ? `<li>Contient: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaHighlights_en": "<ul><li>Title: [Pack name in English]</li><li>Type: Book Pack</li>${selectedTitles ? `<li>Contains: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaPackageContent_ar": "1 x باقة كتب : [اسم الحزمة بالعربية]",
  "jumiaPackageContent_fr": "1 x Pack de livres : [Nom du pack en français]",
  "jumiaPackageContent_en": "1 x Book pack : [Pack name in English]",
  "jumiaHighlights": "<ul><li>Titre: [Nom du pack en français]</li><li>Type: Pack de Livres</li>${selectedTitles ? `<li>Contient: ${selectedTitles}</li>` : ''}</ul>",
  "jumiaPackageContent": "1 x Pack de livres : [Nom du pack en français]",
  "originalPrice": ${totalOriginalPrice},
  "price": "[Prix promotionnel proposé en MAD, nombre entier inférieur à ${totalOriginalPrice}]",
  "sellerSku": "[SKU Jumia unique, par exemple RIW-PACK-XXXX]"
}
Ensure all descriptions and highlights are provided in Arabic, French and English and formatted properly. Never use the vertical bar (|) in titles or descriptions (use hyphens - instead). HTML in highlights must use clean <ul> and <li> tags.`

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

            // Noms
            const nAr = data.name_ar || data.nameAr || data.title_ar || data.titleAr
            const nFr = data.name_fr || data.nameFr || data.title_fr || data.titleFr
            const nEn = data.name_en || data.nameEn || data.title_en || data.titleEn
            const cleanName = (val: string) => (val || '').replace(/\|/g, '-').replace(/\s+/g, ' ').trim()
            if (nAr) setName(cleanName(nAr))
            if (nFr) setNameFr(cleanName(nFr))
            if (nEn) setNameEn(cleanName(nEn))

            // Descriptions
            const dAr = data.description_ar || data.descriptionAr
            const dFr = data.description_fr || data.descriptionFr
            const dEn = data.description_en || data.descriptionEn
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
            if (cAr) setJumiaPackageContentAr(cAr)
            if (cFr) setJumiaPackageContentFr(cFr)
            if (cEn) setJumiaPackageContentEn(cEn)

            // Prix et SKU communs à toutes les langues
            const parsePrice = (value: unknown) => {
                if (typeof value === 'number' && Number.isFinite(value)) return String(Math.round(value))
                if (typeof value !== 'string') return ''
                const parsed = Number.parseFloat(value.replace(/[^0-9.,-]/g, '').replace(',', '.'))
                return Number.isFinite(parsed) ? String(Math.round(parsed)) : ''
            }
            const pastedOriginalPrice = parsePrice(data.originalPrice ?? data.original_price ?? data.retailPrice ?? data.retail_price)
            const pastedPromotionPrice = parsePrice(data.price ?? data.promotionPrice ?? data.promotion_price ?? data.promoPrice ?? data.promo_price)
            const pastedSellerSku = data.sellerSku ?? data.seller_sku ?? data.sku

            setOriginalPrice(pastedOriginalPrice || String(totalOriginalPrice))
            if (pastedPromotionPrice) setPromotionPrice(pastedPromotionPrice)
            if (typeof pastedSellerSku === 'string' && pastedSellerSku.trim()) {
                setSellerSku(pastedSellerSku.trim().toUpperCase())
            }

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
                    <h1 className="text-3xl font-bold text-gray-900">Créer un pack</h1>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                        <span className="text-sm font-medium text-gray-500">État du Pack :</span>
                        {selectedBooksData.length === 0 ? (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200">Vide</span>
                        ) : selectedBooksData.some(b => b.stock <= 0) ? (
                            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Incomplet ({selectedBooksData.filter(b => b.stock <= 0).length} produit(s) en rupture)
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Complet
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-600">
                        Créez une offre groupée de livres et accessoires
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <button
                            type="button"
                            onClick={copyChatGptPrompt}
                            disabled={selectedBooksData.length === 0}
                            aria-disabled={selectedBooksData.length === 0}
                            title={selectedBooksData.length === 0 ? 'Sélectionnez au moins un produit' : 'Copier le prompt ChatGPT'}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium text-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:hover:bg-gray-300"
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
                        {selectedBooksData.length === 0 && (
                            <span className="text-xs font-medium text-amber-700 sm:ml-1">
                                Sélectionnez au moins un produit
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Saisie Rapide Pack & Livres */}
            <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-5 shadow-sm">
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                                    <button
                                        type="button"
                                        onClick={generateDescription}
                                        className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 transition-all bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100"
                                    >
                                        ✨ Générer la description
                                    </button>
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
                                    value={originalPrice}
                                    onChange={e => setOriginalPrice(e.target.value)}
                                    min="0"
                                    step="1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="500"
                                />
                                {selectedBooks.length > 0 && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Prix total des produits sélectionnés: <span className="font-medium">{totalOriginalPrice} درهم</span>
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
                                    value={promotionPrice}
                                    onChange={e => setPromotionPrice(e.target.value)}
                                    required
                                    min="0"
                                    step="1"
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
                                        value={sellerSku}
                                        onChange={e => setSellerSku(e.target.value.toUpperCase())}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="SKU vendeur pour synchronisation"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSellerSku(`RIW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`)}
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
                                <ImageInput defaultValue={packImage} bookTitle={name} />
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
                                        ? `<ul><li>العنوان: ${name || 'اسم الحزمة'}</li><li>النوع: باقة كتب</li></ul>`
                                        : `<ul><li>Titre: ${nameFr || name || 'Nom du pack'}</li><li>Type: Pack de Livres</li></ul>`}
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
                                        ? `1 x باقة كتب : ${name || 'اسم الحزمة'}`
                                        : `1 x Pack de livres : ${nameFr || name || 'Nom du pack'}`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Exemple: "3 x Livres". Laisser vide pour la valeur par défaut.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sélection des livres */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Sélectionner les produits ({selectedBooks.length} sélectionné{selectedBooks.length > 1 ? 's' : ''})
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
                                <option value="ALL">Tous les auteurs et types ({books.length})</option>
                                {authors.map(a => <option key={a} value={a}>{a} ({authorBookCounts[a] || 0})</option>)}
                            </select>
                            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="ALL">Toutes les langues</option>
                                {languages.map(l => <option key={l} value={l}>{l === 'ar' ? 'Arabe' : l === 'fr' ? 'Français' : l === 'en' ? 'Anglais' : l}</option>)}
                            </select>
                        </div>
                        <div className="max-h-96 overflow-y-auto pr-2">
                            {Object.entries(groupedBooks).length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Aucun produit trouvé</p>
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
                                                            {book.title}
                                                            <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${book.itemType === 'BOOK' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {book.itemType === 'BOOK' ? 'Livre' : 'Accessoire'}
                                                            </span>
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
                                <span className="text-gray-600">Produits sélectionnés:</span>
                                <span className="font-medium">{selectedBooks.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Prix total produits:</span>
                                <span className="font-medium">{totalOriginalPrice} درهم</span>
                            </div>
                        </div>

                        {selectedBooksData.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm font-medium text-gray-700 mb-2">Produits inclus:</p>
                                <ul className="space-y-1">
                                    {selectedBooksData.map(book => (
                                        <li key={book.id} className="text-xs text-gray-600 flex justify-between border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                                            <span className="truncate pr-2">• {book.title}</span>
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
                                disabled={loading || selectedBooks.length === 0}
                                className="w-full inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <Save className="w-4 h-4 mr-1.5" />
                                {loading ? '...' : 'Créer le pack'}
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
                pack={{ id: 'new', name, description, price: 0, image: '', isFreeDelivery: false, shippingFees: 0, books: selectedBooksData, whatsappNumber: whatsappPhone }}
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
        </div>
    )
}
