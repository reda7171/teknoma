'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, RefreshCw, Plus, Loader2, BookOpen, X, Eye, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BulkImportResult, RejectedRow } from '@/lib/actions/bulk-import'

interface PreviewRow {
    line: number
    title: string
    lang: string
    price: string
    oldPrice: string
    url: string
    image: string
    stock?: string
    status: 'valid' | 'warning' | 'error'
    message: string
}

interface PreviewData {
    success: boolean
    headers: string[]
    rows: PreviewRow[]
    totalRows: number
    importType: 'new' | 'stock'
    fileName: string
}

interface ImportProgress {
    current: number
    total: number
    percent: number
    title?: string
    imported: number
    failed: number
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 o'
    const k = 1024
    const sizes = ['o', 'Ko', 'Mo', 'Go']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function BulkImportPage() {
    const t = useTranslations('BulkImport')
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState<ImportProgress | null>(null)
    const [result, setResult] = useState<BulkImportResult | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [importType, setImportType] = useState<'new' | 'stock'>('new')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)

    async function loadPreview(file: File, type: 'new' | 'stock') {
        setPreviewLoading(true)
        setPreviewData(null)
        setPreviewError(null)

        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('type', type)

            const res = await fetch('/api/admin/books/bulk-import/preview', {
                method: 'POST',
                body: fd,
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setPreviewData(data)
            } else {
                setPreviewError(data.message || 'Impossible d\'analyser le fichier pour la prévisualisation.')
            }
        } catch {
            setPreviewError('Erreur de communication lors de la prévisualisation.')
        } finally {
            setPreviewLoading(false)
        }
    }

    function handleFileSelection(file: File | null) {
        setSelectedFile(file)
        setResult(null)
        if (file) {
            loadPreview(file, importType)
        } else {
            setPreviewData(null)
            setPreviewError(null)
        }
    }

    async function handleSubmit(e?: React.FormEvent<HTMLFormElement>) {
        if (e) {
            e.preventDefault()
        }
        if (!selectedFile || loading) return

        setLoading(true)
        setResult(null)
        setProgress({
            current: 0,
            total: 0,
            percent: 0,
            title: 'Analyse du fichier...',
            imported: 0,
            failed: 0,
        })

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('type', importType)

        try {
            const res = await fetch('/api/admin/books/bulk-import', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.message || `Erreur serveur (${res.status})`)
            }

            if (!res.body) {
                throw new Error('Le flux de données serveur est vide.')
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    try {
                        const event = JSON.parse(trimmed)
                        if (event.type === 'progress') {
                            setProgress({
                                current: event.current,
                                total: event.total,
                                percent: event.percent,
                                title: event.title,
                                imported: event.imported,
                                failed: event.failed,
                            })
                        } else if (event.type === 'complete') {
                            setResult(event)
                            setProgress(null)
                            if (event.success && event.imported && event.imported > 0) {
                                setTimeout(() => {
                                    router.push('/admin/products')
                                    router.refresh()
                                }, 3500)
                            }
                        }
                    } catch {
                        // Ligne partielle ou JSON incomplet
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    const event = JSON.parse(buffer.trim())
                    if (event.type === 'complete' || event.success !== undefined) {
                        setResult(event)
                        setProgress(null)
                        if (event.success && event.imported && event.imported > 0) {
                            setTimeout(() => {
                                router.push('/admin/products')
                                router.refresh()
                            }, 3500)
                        }
                    }
                } catch {
                    // Ignorer
                }
            }
        } catch (error: unknown) {
            const err = error as Error
            setResult({
                success: false,
                message: err?.message || 'Erreur lors de la communication avec le serveur.',
            })
            setProgress(null)
        } finally {
            setLoading(false)
        }
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (fileInputRef.current) {
                try {
                    const dt = new DataTransfer()
                    dt.items.add(file)
                    fileInputRef.current.files = dt.files
                } catch {
                    // DataTransfer non supporté sur certains vieux navigateurs
                }
            }
            handleFileSelection(file)
        }
    }

    function downloadExcelTemplate() {
        window.location.href = '/api/admin/books/bulk-import/template'
    }

    function downloadCsvTemplate() {
        const bom = '\uFEFF'
        const csvContent = `${bom}lang,nom,prix,ancien_prix,url,image
fr,Essais de psychanalyse - Sigmund Freud,145.00 Dhs,170.00 Dhs,https://www.jumia.ma/fr/book-bank-publication-essais-de-psychanalyse-sigmund-freud-64639450.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/05/493646/1.jpg?2323
fr,pouvoir illimité,94.00 Dhs,170.00 Dhs,https://www.jumia.ma/fr/book-bank-publication-pouvoir-illimite-64639407.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/493646/1.jpg?1683
arb,علم الإقتصاد ببساطة,110.00 Dhs,,https://www.jumia.ma/ar/our-shop-economie-simplifiee-8711291.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/19/21178/1.jpg?8826
arb,علم المقابلات الجديد: دراسة علمية للمقابلات,210.00 Dhs,,https://www.jumia.ma/ar/our-shop-interviewology-le-nouvel-art-de-l-entretien-87430195.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/59/103478/1.jpg?8658
arb,علم نفس القيادة: مبادئ خالدة لتحسين إدارتك للأفراد والفرق ولنفسك!,220.00 Dhs,,https://www.jumia.ma/ar/our-shop-la-psychologie-du-leadership-principes-intemporels-pour-ameliorer-votre-gestion-des-individus-des-equipes-et-de-vous-meme-87430311.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/11/303478/1.jpg?8731
arb,علمتني سورة البقرة,124.00 Dhs,170.00 Dhs,https://www.jumia.ma/ar/book-bank-publication-63903607.html,https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/630636/1.jpg?2563`

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'template_livres_tekno.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    function downloadRejectedReport(rows: RejectedRow[]) {
        if (!rows || rows.length === 0) return

        const bom = '\uFEFF'
        const headers = ['Ligne', 'Motif_du_Rejet', 'lang', 'nom', 'prix', 'ancien_prix', 'url', 'image']
        const csvRows = [headers.join(',')]

        for (const row of rows) {
            const escaped = [
                row.line,
                `"${(row.reason || '').replace(/"/g, '""')}"`,
                `"${(row.lang || 'fr').replace(/"/g, '""')}"`,
                `"${(row.title || '').replace(/"/g, '""')}"`,
                `"${(row.price !== undefined ? String(row.price) : '').replace(/"/g, '""')}"`,
                `"${(row.oldPrice !== undefined ? String(row.oldPrice) : '').replace(/"/g, '""')}"`,
                `"${(row.url || '').replace(/"/g, '""')}"`,
                `"${(row.image || '').replace(/"/g, '""')}"`,
            ]
            csvRows.push(escaped.join(','))
        }

        const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport_rejets_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/products"
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Importation & Mise à jour</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Importez de nouveaux produits ou mettez à jour votre stock en masse
                </p>
            </div>

            {/* Switch Mode */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6 max-w-md">
                <button
                    onClick={() => {
                        setImportType('new')
                        setResult(null)
                        if (selectedFile) {
                            loadPreview(selectedFile, 'new')
                        }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${importType === 'new' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Plus className="w-4 h-4" />
                    Nouveaux Produits
                </button>
                <button
                    onClick={() => {
                        setImportType('stock')
                        setResult(null)
                        if (selectedFile) {
                            loadPreview(selectedFile, 'stock')
                        }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${importType === 'stock' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <RefreshCw className="w-4 h-4" />
                    Mise à jour Stock
                </button>
            </div>

            {/* Instructions */}
            <div className={`${importType === 'new' ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-xl p-6 mb-6 shadow-sm`}>
                <h2 className={`text-lg font-bold mb-4 flex items-center ${importType === 'new' ? 'text-blue-900' : 'text-emerald-900'}`}>
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Instructions ({importType === 'new' ? 'Importation' : 'Stock'})
                </h2>
                {importType === 'new' ? (
                    <div className="space-y-4">
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Téléchargez le fichier template ci-dessous (au format Excel <strong>.xlsx</strong> ou <strong>.csv</strong>)</li>
                            <li>Remplissez le fichier avec vos données sans modifier les en-têtes</li>
                            <li>Structure des colonnes requise : <strong>lang, nom, prix, ancien_prix, url, image</strong></li>
                            <li><em>Note : Les langues supportées sont <code>fr</code>, <code>arb</code> (arabe) et <code>en</code>. Les prix acceptent la mention <code>Dhs</code>. Le stock est mis à 100 par défaut s&apos;il n&apos;est pas précisé.</em></li>
                            <li>Uploadez le fichier complété (.xlsx, .xls, .csv)</li>
                        </ol>

                        {/* Aperçu visuel des colonnes du template */}
                        <div className="mt-4 bg-white/90 border border-blue-200 rounded-lg p-3 overflow-x-auto text-xs">
                            <p className="font-semibold text-blue-950 mb-2">Aperçu de la nouvelle structure de template :</p>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-700 bg-gray-50">
                                        <th className="p-2 font-bold">lang</th>
                                        <th className="p-2 font-bold">nom</th>
                                        <th className="p-2 font-bold">prix</th>
                                        <th className="p-2 font-bold">ancien_prix</th>
                                        <th className="p-2 font-bold">url</th>
                                        <th className="p-2 font-bold">image</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 divide-y divide-gray-100">
                                    <tr>
                                        <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">fr</span></td>
                                        <td className="p-2">Essais de psychanalyse - Sigmund Freud</td>
                                        <td className="p-2 font-semibold text-gray-900">145.00 Dhs</td>
                                        <td className="p-2 text-gray-400 line-through">170.00 Dhs</td>
                                        <td className="p-2 text-blue-600 truncate max-w-[150px]">https://www.jumia.ma/fr/...</td>
                                        <td className="p-2 text-blue-600 truncate max-w-[150px]">https://ma.jumia.is/...</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">arb</span></td>
                                        <td className="p-2" dir="rtl">علم الإقتصاد ببساطة</td>
                                        <td className="p-2 font-semibold text-gray-900">110.00 Dhs</td>
                                        <td className="p-2 text-gray-400">-</td>
                                        <td className="p-2 text-blue-600 truncate max-w-[150px]">https://www.jumia.ma/ar/...</td>
                                        <td className="p-2 text-blue-600 truncate max-w-[150px]">https://ma.jumia.is/...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={downloadExcelTemplate}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger Template Excel (.xlsx)
                            </button>
                            <button
                                type="button"
                                onClick={downloadCsvTemplate}
                                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger Template CSV (.csv)
                            </button>
                        </div>
                    </div>
                ) : (
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Utilisez un fichier <strong>TSV</strong> (Tab-Separated Values)</li>
                        <li>Format requis : une ligne d&apos;en-tête, puis <strong>Nom[TAB]stock</strong></li>
                        <li>Exemple : <code>Produit Cadeaux [TAB] 40</code></li>
                        <li>Le système cherchera le produit par son nom exact pour mettre à jour son stock.</li>
                        <li>Uploadez votre fichier <strong>.tsv</strong></li>
                    </ol>
                )}
            </div>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg border border-gray-200 p-6">
                <div
                    className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
                        dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : selectedFile
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50/40'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {selectedFile ? (
                        <div className="flex flex-col items-center justify-center animate-fade-in">
                            <div className="relative mb-3">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                    <FileSpreadsheet className="w-8 h-8" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
                                <span>Fichier prêt pour l&apos;import</span>
                            </div>

                            <h4 className="text-base font-bold text-gray-900 break-all max-w-md">
                                {selectedFile.name}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                                Taille : {formatFileSize(selectedFile.size)} • Type : {selectedFile.type || 'Fichier tableur'}
                            </p>

                            <div className="mt-5 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Changer de fichier</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setSelectedFile(null)
                                        setPreviewData(null)
                                        setPreviewError(null)
                                        if (fileInputRef.current) fileInputRef.current.value = ''
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Supprimer</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer group block mx-auto text-center"
                            >
                                <span className="text-lg font-medium text-gray-700">
                                    Glissez-déposez votre fichier ou{' '}
                                    <span className="text-blue-600 group-hover:text-blue-700 font-bold">
                                        cliquez pour parcourir
                                    </span>
                                </span>
                            </button>
                            <p className="mt-2 text-sm text-gray-500">
                                {importType === 'new' ? 'Formats acceptés: Excel (.xlsx, .xls) ou CSV' : 'Formats acceptés: TSV (.tsv) ou Texte (.txt)'}
                            </p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        id="bulk-import-file-input"
                        name="file"
                        accept={importType === 'new' ? ".xlsx,.xls,.csv" : ".tsv,.txt"}
                        className="hidden"
                        disabled={loading}
                        onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
                    />
                </div>

                {/* Prévisualisation interactive des 5 premières lignes */}
                {previewLoading && (
                    <div className="mt-6 p-6 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col items-center justify-center gap-3 animate-pulse">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-blue-900">
                            {t('PreviewLoading')}
                        </p>
                    </div>
                )}

                {previewError && (
                    <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Aperçu impossible</p>
                            <p className="mt-0.5 text-xs text-red-700">{previewError}</p>
                        </div>
                    </div>
                )}

                {previewData && previewData.rows.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        {/* Header de la prévisualisation */}
                        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {t('PreviewTitle')}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {t('PreviewSubtitle')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200/80 text-gray-800">
                                    {t('TotalRowsDetected', { count: previewData.totalRows })}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    5 premières lignes affichées
                                </span>
                            </div>
                        </div>

                        {/* Table interactive */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 w-12 text-center">#</th>
                                        {importType === 'new' && (
                                            <>
                                                <th className="py-3 px-3 w-16 text-center">{t('PreviewImage')}</th>
                                                <th className="py-3 px-3 w-16 text-center">{t('ColLang')}</th>
                                            </>
                                        )}
                                        <th className="py-3 px-4">{t('ColTitle')}</th>
                                        {importType === 'new' ? (
                                            <>
                                                <th className="py-3 px-3">{t('ColPrice')}</th>
                                                <th className="py-3 px-3">{t('PreviewOldPrice')}</th>
                                            </>
                                        ) : (
                                            <th className="py-3 px-3">{t('PreviewStock')}</th>
                                        )}
                                        <th className="py-3 px-4 text-center">{t('PreviewStatus')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {previewData.rows.map((row) => (
                                        <tr key={row.line} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="py-2.5 px-3 text-center font-mono text-gray-400 font-semibold">
                                                {row.line}
                                            </td>

                                            {importType === 'new' && (
                                                <>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {row.image ? (
                                                            <div className="relative w-8 h-10 mx-auto rounded overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs group cursor-pointer">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={row.image}
                                                                    alt={row.title}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-125"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement
                                                                        target.src = '/book-placeholder.png'
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-10 mx-auto rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                                                            row.lang === 'ar' || row.lang === 'arb'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : row.lang === 'en'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-slate-100 text-slate-800'
                                                        }`}>
                                                            {row.lang}
                                                        </span>
                                                    </td>
                                                </>
                                            )}

                                            <td className="py-2.5 px-4 font-medium text-gray-900 max-w-xs truncate" title={row.title}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate">{row.title}</span>
                                                    {row.url && (
                                                        <a
                                                            href={row.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                                                            title="Ouvrir le lien source"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {importType === 'new' ? (
                                                <>
                                                    <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                                                        {row.price ? (row.price.includes('Dh') ? row.price : `${row.price} DH`) : '-'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-gray-400 line-through whitespace-nowrap">
                                                        {row.oldPrice ? (row.oldPrice.includes('Dh') ? row.oldPrice : `${row.oldPrice} DH`) : '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="py-2.5 px-3 font-bold text-gray-900">
                                                    {row.stock ?? '-'}
                                                </td>
                                            )}

                                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                {row.status === 'valid' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>{t('PreviewValid')}</span>
                                                    </span>
                                                ) : row.status === 'warning' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800" title={row.message}>
                                                        <AlertTriangle className="w-3 h-3" />
                                                        <span>{t('PreviewWarning')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800" title={row.message}>
                                                        <XCircle className="w-3 h-3" />
                                                        <span>{row.message || t('PreviewError')}</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer de validation */}
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                            <span>
                                Vérification préalable réussie. Les images externes seront servies au format WebP/AVIF via le CDN Tekno Store.
                            </span>
                            <span className="font-semibold text-gray-700">
                                5 lignes vérifiées
                            </span>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="mt-6 flex items-center justify-end gap-4">
                    <Link
                        href="/admin/products"
                        className={`px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    >
                        Annuler
                    </Link>
                    <button
                        type="submit"
                        disabled={loading || previewLoading || !selectedFile}
                        className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {progress && progress.total > 0 ? `${progress.percent}% (${progress.current}/${progress.total})` : 'Traitement...'}
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 mr-2" />
                                {previewData?.totalRows
                                    ? `${t('ConfirmImport')} (${previewData.totalRows} ${importType === 'new' ? 'produits' : 'lignes'})`
                                    : importType === 'new'
                                    ? t('ConfirmImport')
                                    : 'Mettre à jour le stock'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Real-time Progress Bar */}
            {loading && progress && (
                <div className="mt-6 bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {importType === 'new' ? 'Importation en direct' : 'Mise à jour du stock en direct'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {progress.total > 0
                                        ? `${progress.current} sur ${progress.total} produit(s) traité(s)`
                                        : 'Traitement du fichier en cours...'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-blue-600 tracking-tight">
                                {progress.percent}%
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5">
                        <div
                            className="bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${Math.max(progress.percent, 3)}%` }}
                        />
                    </div>

                    {/* Live Details */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 truncate max-w-md">
                            <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate font-medium">
                                {progress.title ? `Produit : ${progress.title}` : 'Lecture des lignes...'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
                                ✓ {progress.imported} réussi(s)
                            </span>
                            {progress.failed > 0 && (
                                <span className="px-2.5 py-0.5 bg-red-50 text-red-700 font-bold rounded-full border border-red-200">
                                    ✗ {progress.failed} échec(s)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className={`mt-6 p-6 rounded-lg border ${result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start">
                        {result.success ? (
                            <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-grow">
                            <h3 className={`text-lg font-bold ${result.success ? 'text-green-900' : 'text-red-900'
                                }`}>
                                {result.message}
                            </h3>

                            {result.imported !== undefined && result.failed !== undefined && (
                                <div className="mt-2 text-sm">
                                    <p className="text-green-700">✓ {result.imported} produit(s) importé(s)</p>
                                    {result.failed > 0 && (
                                        <p className="text-red-700">✗ {result.failed} échec(s)</p>
                                    )}
                                </div>
                            )}

                            {/* Rapport récapitulatif des lignes rejetées */}
                            {result.rejectedRows && result.rejectedRows.length > 0 ? (
                                <div className="mt-5 border-t border-red-200/80 pt-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-red-950 flex items-center gap-2">
                                                <span>{t('RejectionReportTitle')}</span>
                                                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-mono font-bold">
                                                    {result.rejectedRows.length} ligne(s)
                                                </span>
                                            </h4>
                                            <p className="text-xs text-red-700 mt-0.5">
                                                {t('RejectionReportSubtitle')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => downloadRejectedReport(result.rejectedRows!)}
                                            className="inline-flex items-center px-3.5 py-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-xs shadow-sm cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            {t('DownloadRejectionReport')}
                                        </button>
                                    </div>

                                    {/* Tableau détaillé des rejets */}
                                    <div className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-xs max-h-80 overflow-y-auto text-xs">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-red-50/70 sticky top-0 border-b border-red-100 text-red-900 font-bold z-10">
                                                <tr>
                                                    <th className="py-2.5 px-3 w-16 text-center">{t('ColLine')}</th>
                                                    <th className="py-2.5 px-3">{t('ColTitle')}</th>
                                                    <th className="py-2.5 px-3 w-20 text-center">{t('ColLang')}</th>
                                                    <th className="py-2.5 px-3 w-28">{t('ColPrice')}</th>
                                                    <th className="py-2.5 px-3">{t('ColReason')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {result.rejectedRows.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                                                        <td className="py-2 px-3 font-mono text-red-800 font-bold text-center">
                                                            #{item.line}
                                                        </td>
                                                        <td className="py-2 px-3 font-medium text-gray-900 max-w-[220px] truncate" title={item.title}>
                                                            {item.title || t('NoTitle')}
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] rounded uppercase font-bold">
                                                                {item.lang || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-gray-800">
                                                            {item.price !== undefined && item.price !== '' ? `${item.price} Dhs` : '—'}
                                                        </td>
                                                        <td className="py-2 px-3 text-red-700">
                                                            <span className="inline-block px-2 py-0.5 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                                                                {item.reason}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : result.errors && result.errors.length > 0 ? (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-red-900 mb-2">Erreurs détaillées:</p>
                                    <ul className="text-xs text-red-700 space-y-1 max-h-64 overflow-y-auto bg-white/50 rounded p-3">
                                        {result.errors.map((error: string, idx: number) => (
                                            <li key={idx}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {result.success && result.imported && result.imported > 0 && (
                                <p className="mt-3 text-sm text-green-700">
                                    Redirection vers la liste des produits dans 3 secondes...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
