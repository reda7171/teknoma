'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
    Search,
    Shield,
    Barcode,
    ExternalLink,
    Copy,
    Check,
    X,
    Loader2,
    Calendar,
    Phone,
    MapPin,
    Package,
    Smartphone
} from 'lucide-react'
import { searchImeiQuick, type ImeiSearchResult } from '@/lib/actions/imei-search'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function GlobalImeiSearch() {
    const params = useParams()
    const locale = (params?.locale as string) || 'fr'

    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [results, setResults] = useState<ImeiSearchResult[]>([])
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null)
    const [isSearching, startSearch] = useTransition()

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Clavier raccourci Ctrl+K ou Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            } else if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Clic en dehors pour fermer
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSearch = (value: string) => {
        setQuery(value)
        const trimmed = value.trim()
        if (trimmed.length >= 2) {
            setIsOpen(true)
            startSearch(async () => {
                const res = await searchImeiQuick(trimmed)
                setResults(res)
            })
        } else {
            setResults([])
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSerial(text)
        setTimeout(() => setCopiedSerial(null), 2000)
    }

    return (
        <div ref={containerRef} className="relative w-full max-w-lg">
            {/* Champ de recherche */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Barcode className="w-4 h-4 text-slate-500" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => {
                        if (query.trim().length >= 2) setIsOpen(true)
                    }}
                    placeholder="Scanner ou coller un IMEI / N° Série... (Ctrl+K)"
                    className="w-full pl-10 pr-16 py-2 bg-slate-50 hover:bg-white focus:bg-white text-xs font-medium text-slate-900 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5 pointer-events-none">
                    {isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    ) : (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md font-sans shadow-2xs">
                            Ctrl K
                        </span>
                    )}
                </div>
            </div>

            {/* Fenêtre des résultats instantanés */}
            {isOpen && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 max-h-[80vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header des résultats */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-slate-800">
                                Traçabilité & Garantie IMEI
                            </span>
                            <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {results.length} résultat{results.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Fermer la recherche IMEI"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Liste des résultats */}
                    <div className="overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                        {isSearching ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                <span>Recherche du numéro de série en cours...</span>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-500">
                                <Smartphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="font-bold text-slate-700">Aucun appareil trouvé</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Le numéro « <span className="font-mono">{query}</span> » ne correspond à aucun IMEI ou code-barres enregistré.
                                </p>
                            </div>
                        ) : (
                            results.map((item, idx) => {
                                const isSold = item.status === 'SOLD'
                                const isDefective = item.status === 'DEFECTIVE'
                                const isAvailable = item.status === 'AVAILABLE'

                                return (
                                    <div
                                        key={item.serialNumber + idx}
                                        className="p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-200/70 transition-all space-y-3"
                                    >
                                        {/* IMEI & Status Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                                    {item.serialNumber}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(item.serialNumber)}
                                                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                                                    title="Copier le numéro"
                                                >
                                                    {copiedSerial === item.serialNumber ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                                                        isAvailable
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : isSold
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {isAvailable ? 'En stock' : isSold ? 'Vendu' : 'SAV / Défectueux'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Garantie Badge */}
                                        <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200/70">
                                            <div className="flex items-center gap-2">
                                                <Shield
                                                    className={`w-4 h-4 ${
                                                        item.warranty.status === 'ACTIVE'
                                                            ? 'text-emerald-600'
                                                            : item.warranty.status === 'EXPIRED'
                                                                ? 'text-slate-400'
                                                                : item.warranty.status === 'NOT_STARTED'
                                                                    ? 'text-blue-600'
                                                                    : 'text-red-500'
                                                    }`}
                                                />
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[11px]">
                                                        {item.warranty.status === 'ACTIVE' && (
                                                            <span className="text-emerald-700">
                                                                Garantie constructeur active ({item.warranty.daysRemaining} jours restants)
                                                            </span>
                                                        )}
                                                        {item.warranty.status === 'EXPIRED' && (
                                                            <span className="text-slate-500">
                                                                Garantie officielle 12M expirée
                                                            </span>
                                                        )}
                                                        {item.warranty.status === 'NOT_STARTED' && (
                                                            <span className="text-blue-700">
                                                                Garantie 12M prête à l'activation (Unité en stock)
                                                            </span>
                                                        )}
                                                        {item.warranty.status === 'DEFECTIVE' && (
                                                            <span className="text-red-700">
                                                                Appareil en procédure SAV / Défectueux
                                                            </span>
                                                        )}
                                                    </p>
                                                    {item.warranty.startDate && (
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Calendar className="w-3 h-3" />
                                                            Du {new Date(item.warranty.startDate).toLocaleDateString('fr-FR')} au {item.warranty.endDate ? new Date(item.warranty.endDate).toLocaleDateString('fr-FR') : '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Produit Associé */}
                                        {item.product && (
                                            <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {item.product.image ? (
                                                        <img
                                                            src={item.product.image}
                                                            alt={item.product.title}
                                                            className="w-10 h-10 object-contain rounded-md border border-slate-100 bg-white shrink-0 p-0.5"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                                                            <Package className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {item.product.title}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            Marque : <strong className="text-slate-700">{item.product.author}</strong> &bull; {item.product.price} DH
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/${locale}/admin/products/${item.product.id}/edit`}
                                                    onClick={() => setIsOpen(false)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0 transition"
                                                >
                                                    Fiche
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        )}

                                        {/* Commande Liée */}
                                        {item.order && (
                                            <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-amber-900 flex items-center gap-1">
                                                        Commande #{item.order.id.slice(0, 8)}
                                                        {item.order.invoiceNumber && (
                                                            <span className="text-[10px] font-mono text-amber-700 ml-1">
                                                                ({item.order.invoiceNumber})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <Link
                                                        href={`/${locale}/admin/orders/${item.order.id}`}
                                                        onClick={() => setIsOpen(false)}
                                                        className="font-bold text-[11px] text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
                                                    >
                                                        Voir commande & garantie
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium">Client :</span>
                                                        <strong className="text-slate-900">{item.order.fullName}</strong>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        <a
                                                            href={`tel:${item.order.phone}`}
                                                            className="text-blue-600 hover:underline font-mono"
                                                        >
                                                            {item.order.phone}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 sm:col-span-2">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        <span>{item.order.city} &bull; {item.order.address}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
