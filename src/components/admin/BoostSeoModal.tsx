'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Copy, Check, FileJson, ArrowRight, ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface SeoBoostData {
    title_ar?: string
    title_fr?: string
    title_en?: string
    author?: string
    description_ar?: string
    description_fr?: string
    description_en?: string
    longDescription_ar?: string
    longDescription_fr?: string
    longDescription_en?: string
    seoKeywords?: string
    category?: string
    subCategory?: string
    isbn?: string
    jumiaHighlights?: string
    jumiaPackageContent?: string
}

interface BoostSeoModalProps {
    isOpen: boolean
    onClose: () => void
    initialTab?: 'prompt' | 'inject'
    book: any
    currentAuthor?: string
    currentDescription?: string
    currentDescriptionFr?: string
    currentDescriptionEn?: string
    currentLongDescription?: string
    currentLongDescriptionFr?: string
    currentLongDescriptionEn?: string
    currentSeoKeywords?: string
    onApply: (data: SeoBoostData) => void
}

export default function BoostSeoModal({
    isOpen,
    onClose,
    initialTab = 'prompt',
    book,
    currentAuthor,
    currentDescription,
    currentDescriptionFr,
    currentDescriptionEn,
    currentLongDescription,
    currentLongDescriptionFr,
    currentLongDescriptionEn,
    currentSeoKeywords,
    onApply,
}: BoostSeoModalProps) {
    const t = useTranslations('BoostSeo')
    const [activeTab, setActiveTab] = useState<'prompt' | 'inject'>(initialTab)
    const [copied, setCopied] = useState(false)
    const [jsonInput, setJsonInput] = useState('')
    const [parseError, setParseError] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<SeoBoostData | null>(null)
    const [applySuccess, setApplySuccess] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab)
            setCopied(false)
            setParseError(null)
            setApplySuccess(false)
        }
    }, [isOpen, initialTab])

    if (!isOpen) return null

    const title = book?.title || 'Titre inconnu'
    const author = currentAuthor || book?.author || 'Auteur inconnu'
    const isbn = book?.isbn || ''
    const category = book?.category || ''

    // Construction du prompt calibré pour 100% de score SEO
    const promptText = `Act as an elite e-commerce book SEO expert for the online bookstore "PetsUnivers".
Optimize the metadata and descriptions for this book to guarantee a 100% SEO Score based on the following strict rules:

TARGET 100% SEO CHECKLIST:
1. Arabic Title (title_ar): Catchy, searchable, between 5 and 70 characters.
2. French Title (title_fr): Minimum 5 characters. CRITICAL: Use the phonetic transcription (transliteration) in Latin characters if original is Arabic (e.g., "سلسلة روايات بساتين عربستان" -> "Silsilat petsuniverst basatin arabistan").
3. English Title (title_en): Minimum 5 characters.
4. Author (author): Full verified name (min 2 chars).
5. Short Arabic Description (description_ar): Minimum 100 characters (compelling, rich in natural search terms).
6. Short French Description (description_fr): Minimum 100 characters.
7. Short English Description (description_en): Minimum 100 characters.
8. Long Arabic Description (longDescription_ar): Minimum 250 characters (themes, summary, author bio, historical/cultural context).
9. Long French Description (longDescription_fr): Minimum 250 characters.
10. Long English Description (longDescription_en): Minimum 250 characters.
11. SEO Keywords (seoKeywords): Minimum 6 to 10 high-intent keywords separated by commas (mix of Arabic, French, and English).
12. ISBN (isbn): Provide the exact authentic official ISBN-10 or ISBN-13 of this specific book if known, or leave "${isbn || ''}" unchanged. CRITICAL: Never invent a fake or duplicate generic placeholder number.
13. Categories: Suggest main category and subcategory.
14. Jumia Highlights (jumiaHighlights): HTML unordered list <ul><li>...</li></ul> with 3 to 5 key points.
15. Jumia Package Content (jumiaPackageContent): e.g., "1 x Livre papier format standard".

CURRENT BOOK DATA:
- Current Title: ${title}
- Current Author: ${author}
- Current ISBN: ${isbn || 'Non renseigné'}
- Current Category: ${category || 'Non renseignée'}
- Current Description: ${currentDescription || book?.description || 'Aucune'}

CRITICAL INSTRUCTION:
Return ONLY a valid JSON object without markdown fences, commentary, or text before/after.
Matching format:
{
  "title_ar": "...",
  "title_fr": "...",
  "title_en": "...",
  "author": "${author}",
  "description_ar": "...",
  "description_fr": "...",
  "description_en": "...",
  "longDescription_ar": "...",
  "longDescription_fr": "...",
  "longDescription_en": "...",
  "seoKeywords": "mot-clé 1, mot-clé 2, mot-clé 3, mot-clé 4, mot-clé 5, mot-clé 6",
  "category": "${category || 'Romans & Littérature'}",
  "subCategory": "Roman",
  "isbn": "${isbn || ''}",
  "jumiaHighlights": "<ul><li>Édition intégrale de haute qualité</li><li>Style d'écriture captivant</li><li>Idéal pour passionnés de lecture</li></ul>",
  "jumiaPackageContent": "1 x Livre papier"
}`

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(promptText)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        } catch {
            setCopied(true)
        }
    }

    const handlePasteFromClipboard = async () => {
        try {
            setParseError(null)
            const text = await navigator.clipboard.readText()
            if (!text || !text.trim()) {
                setParseError('Le presse-papier est vide.')
                return
            }
            setJsonInput(text)
            validateAndSetJson(text)
        } catch (err: any) {
            setParseError('Impossible de lire le presse-papier. Collez manuellement le texte ci-dessous.')
        }
    }

    const validateAndSetJson = (rawText: string) => {
        try {
            setParseError(null)
            const cleaned = rawText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/, '')
                .replace(/\s*```$/, '')
                .trim()
            const parsed = JSON.parse(cleaned)
            if (parsed.isbn && ['9789920000000', '0000000000', '1234567890'].includes(parsed.isbn.trim())) {
                delete parsed.isbn
            }
            setParsedData(parsed)
            return parsed
        } catch (e: any) {
            setParsedData(null)
            setParseError(t('InvalidJson'))
            return null
        }
    }

    const handleApply = () => {
        const data = parsedData || validateAndSetJson(jsonInput)
        if (!data) return
        onApply(data)
        setApplySuccess(true)
        setTimeout(() => {
            onClose()
        }, 1200)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{t('ModalTitle')}</h2>
                            <p className="text-xs text-slate-500">{t('ModalSubtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-white">
                    <button
                        type="button"
                        onClick={() => setActiveTab('prompt')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'prompt'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Copy className="w-4 h-4" />
                        {t('TabPrompt')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('inject')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'inject'
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileJson className="w-4 h-4" />
                        {t('TabInject')}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {applySuccess ? (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                            <h3 className="text-base font-bold text-emerald-900">{t('SuccessTitle')}</h3>
                            <p className="text-sm text-emerald-700">{t('SuccessDesc')}</p>
                        </div>
                    ) : activeTab === 'prompt' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
                                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>{t('PromptInstructions')}</span>
                                </div>
                                <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-md whitespace-nowrap ml-3">
                                    Objectif 100%
                                </span>
                            </div>

                            <div className="relative">
                                <pre className="bg-slate-900 text-slate-100 text-xs font-mono p-4 rounded-xl max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                                    {promptText}
                                </pre>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCopyPrompt}
                                    className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                                        copied
                                            ? 'bg-emerald-700 text-white'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            {t('PromptCopied')}
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-2" />
                                            {t('CopyPrompt')}
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('inject')}
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    {t('GoToInject')}
                                    <ArrowRight className="w-4 h-4 ml-1.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    {t('PasteJsonLabel')}
                                </label>
                                <button
                                    type="button"
                                    onClick={handlePasteFromClipboard}
                                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-colors"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                                    {t('PasteFromClipboard')}
                                </button>
                            </div>

                            <textarea
                                rows={8}
                                value={jsonInput}
                                onChange={(e) => {
                                    setJsonInput(e.target.value)
                                    validateAndSetJson(e.target.value)
                                }}
                                placeholder={t('PasteJsonPlaceholder')}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                            />

                            {parseError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{parseError}</span>
                                </div>
                            )}

                            {parsedData && (
                                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-slate-700 space-y-1">
                                    <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        <span>JSON valide et prêt à être injecté</span>
                                    </div>
                                    <p className="truncate"><strong>Titre AR:</strong> {parsedData.title_ar || '—'}</p>
                                    <p className="truncate"><strong>Titre FR:</strong> {parsedData.title_fr || '—'}</p>
                                    <p className="truncate"><strong>Mots-clés:</strong> {parsedData.seoKeywords || '—'}</p>
                                    <p><strong>Descriptions:</strong> AR ({(parsedData.description_ar || '').length} car.), FR ({(parsedData.description_fr || '').length} car.), Longue ({(parsedData.longDescription_ar || '').length} car.)</p>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    disabled={!parsedData}
                                    className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {t('ApplyBtn')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
