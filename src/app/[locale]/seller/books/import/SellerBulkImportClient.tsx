'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import {
    Upload,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    AlertCircle,
    Download,
    ArrowLeft,
    RefreshCw,
    X,
    HelpCircle,
    BookOpen
} from 'lucide-react'
import { importSellerBooksFromExcel, SellerBulkImportResult } from '@/lib/actions/seller/dashboard'

export default function SellerBulkImportClient() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<SellerBulkImportResult | null>(null)
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0])
        }
    }

    const validateAndSetFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
            setFeedback({
                type: 'error',
                message: 'Format non supporté. Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV (.csv).'
            })
            return
        }
        setSelectedFile(file)
        setResult(null)
        setFeedback(null)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setIsSubmitting(true)
        setFeedback(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const res = await importSellerBooksFromExcel(formData)
            setResult(res)

            if (res.success) {
                setFeedback({
                    type: 'success',
                    message: res.message
                })
            } else {
                setFeedback({
                    type: 'error',
                    message: res.message || 'Erreur lors de l\'importation'
                })
            }
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err?.message || 'Une erreur inattendue est survenue.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetSelection = () => {
        setSelectedFile(null)
        setResult(null)
        setFeedback(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <Link
                        href="/seller/books"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black mb-3 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour au catalogue
                    </Link>
                    <h1 className="text-3xl font-black text-black tracking-tighter uppercase">
                        Importation en masse de livres
                    </h1>
                    <p className="text-gray-400 font-bold text-xs mt-1">
                        Téléversez votre inventaire via fichier Excel (.xlsx) ou CSV en quelques secondes
                    </p>
                </div>

                {/* Boutons téléchargement modèles */}
                <div className="flex items-center gap-2">
                    <a
                        href="/api/seller/books/bulk-import/template?format=xlsx"
                        download
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-black font-black text-xs uppercase tracking-wider transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Modèle Excel (.xlsx)
                    </a>
                    <a
                        href="/api/seller/books/bulk-import/template?format=csv"
                        download
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-black font-black text-xs uppercase tracking-wider transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        Modèle CSV (.csv)
                    </a>
                </div>
            </div>

            {/* Guide & Spécifications des colonnes */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-black/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <HelpCircle className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-black text-black uppercase tracking-wider">
                        Guide du format de fichier attendu
                    </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Titre *</span>
                        <span className="text-gray-500">Nom du livre (requis)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Auteur *</span>
                        <span className="text-gray-500">Nom de l'auteur (requis)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Prix (MAD) *</span>
                        <span className="text-gray-500">Montant en chiffres</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Stock</span>
                        <span className="text-gray-500">Exemplaires (défaut: 1)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">ISBN</span>
                        <span className="text-gray-500">Code barre standard</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Langue</span>
                        <span className="text-gray-500">fr, ar ou en</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Description</span>
                        <span className="text-gray-500">Résumé de l'ouvrage</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <span className="font-black text-black block mb-1">Image URL</span>
                        <span className="text-gray-500">Lien vers la couverture</span>
                    </div>
                </div>
            </div>

            {/* Zone de Drag & Drop */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative rounded-3xl border-2 border-dashed p-10 text-center transition-all cursor-pointer bg-white
                    ${isDragging ? 'border-blue-600 bg-blue-50/50 scale-[1.01]' : 'border-gray-200 hover:border-black/20'}
                `}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-400">
                    {selectedFile?.name.endsWith('.csv') ? (
                        <FileText className="w-8 h-8 text-blue-600" />
                    ) : (
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    )}
                </div>

                {selectedFile ? (
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fichier prêt
                        </div>
                        <p className="text-lg font-black text-black tracking-tight">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400 font-bold mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} Ko
                        </p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                resetSelection()
                            }}
                            className="mt-4 inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-black uppercase tracking-widest"
                        >
                            <X className="w-3.5 h-3.5" /> Retirer le fichier
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-base font-black text-black tracking-tight mb-1">
                            Glissez-déposez votre fichier ici, ou <span className="text-blue-600 underline">parcourez vos dossiers</span>
                        </p>
                        <p className="text-xs text-gray-400 font-bold">
                            Prise en charge des formats .xlsx, .xls et .csv (Taille max: 10 Mo)
                        </p>
                    </div>
                )}
            </div>

            {/* Bouton d'action */}
            {selectedFile && !result?.success && (
                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={isSubmitting}
                        className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Importation en cours...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Lancer l'importation du catalogue
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Message de feedback */}
            {feedback && (
                <div
                    className={`p-5 rounded-2xl flex items-start gap-3 border ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs font-bold leading-relaxed">{feedback.message}</div>
                </div>
            )}

            {/* Rapport d'importation */}
            {result && (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-black/5 space-y-6">
                    <h3 className="text-base font-black text-black uppercase tracking-wider">
                        Rapport d'importation
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                                Livres importés
                            </span>
                            <span className="text-2xl font-black text-emerald-900">{result.imported}</span>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">
                                Lignes ignorées
                            </span>
                            <span className="text-2xl font-black text-gray-800">{result.failed}</span>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-red-600">
                                Détails des erreurs ({result.errors.length}) :
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono">
                                {result.errors.map((err, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span className="text-red-500">•</span> {err}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                            onClick={resetSelection}
                            className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                        >
                            Importer un autre fichier
                        </button>
                        <Link
                            href="/seller/books"
                            className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                        >
                            Voir mon catalogue mis à jour
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
