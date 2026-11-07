'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ReadingStatus } from '@prisma/client'
import { updateReadingProgress, removeFromReadingList } from '@/lib/actions/reading-list'
import Image from 'next/image'
import { MoreHorizontal, Trash2, CheckCircle, BookOpen, Clock, Book, Search, X, Check, ArrowRight } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { useTranslations } from 'next-intl'
import { normalizeImage } from '@/lib/utils'
import GenerateReadingCard from './GenerateReadingCard'
import { Link } from '@/i18n/routing'

interface ReadingListBoardProps {
    initialItems: any[]
    user: any
    children?: React.ReactNode
}

const BOARD_TAB_KEY = 'riwaya_reading_board_tab'

const statusConfig = {
    [ReadingStatus.TO_READ]: { icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' },
    [ReadingStatus.READING]: { icon: BookOpen, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    [ReadingStatus.COMPLETED]: { icon: CheckCircle, color: 'bg-green-50 text-green-800 border-green-200' },
    [ReadingStatus.ON_HOLD]: { icon: MoreHorizontal, color: 'bg-amber-50 text-amber-800 border-amber-200' },
    [ReadingStatus.DROPPED]: { icon: Trash2, color: 'bg-red-50 text-red-800 border-red-200' }
}

export default function ReadingListBoard({ initialItems, user, children }: ReadingListBoardProps) {
    const t = useTranslations('Community.ReadingList')
    const [items, setItems] = useState(initialItems)
    const [activeTab, setActiveTab] = useState<ReadingStatus>(ReadingStatus.READING)
    const [searchQuery, setSearchQuery] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
    const { showNotification } = useUIStore()
    const progressDebounceTimer = useRef<Record<string, NodeJS.Timeout>>({})

    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

    // Restaure le dernier onglet consulté mémorisé dans le stockage local
    useEffect(() => {
        try {
            const saved = localStorage.getItem(BOARD_TAB_KEY) as ReadingStatus | null
            if (saved && Object.values(ReadingStatus).includes(saved)) {
                setActiveTab(saved)
            }
        } catch {}
    }, [])

    const handleSelectTab = (status: ReadingStatus) => {
        setActiveTab(status)
        try {
            localStorage.setItem(BOARD_TAB_KEY, status)
        } catch {}
    }

    const handleUpdateStatus = async (id: string, newStatus: ReadingStatus) => {
        setActiveMenuId(null)
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))

        const result = await updateReadingProgress({ id, currentPage: newStatus === ReadingStatus.COMPLETED ? undefined : 0, status: newStatus })
        if (!result.success) {
            showNotification('Erreur lors de la mise à jour', 'error')
            setItems(initialItems)
        } else {
            showNotification(t('Status.' + newStatus), 'success')
        }
    }

    const handleUpdateProgress = async (id: string, newPage: number) => {
        const targetPage = Math.max(0, newPage)
        setItems(prev => prev.map(item => item.id === id ? { ...item, currentPage: targetPage } : item))

        if (progressDebounceTimer.current[id]) {
            clearTimeout(progressDebounceTimer.current[id])
        }

        progressDebounceTimer.current[id] = setTimeout(async () => {
            await updateReadingProgress({ id, currentPage: targetPage })
        }, 400)
    }

    const executeDelete = async (id: string) => {
        setConfirmDeleteId(null)
        setItems(prev => prev.filter(item => item.id !== id))
        const res = await removeFromReadingList(id)
        if (res.success) {
            showNotification('Livre retiré de votre liste', 'success')
        } else {
            showNotification('Erreur lors de la suppression', 'error')
            setItems(initialItems)
        }
    }

    // Filtrage dynamique en temps réel
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items
        const q = searchQuery.toLowerCase().trim()
        return items.filter(i => 
            (i.title && i.title.toLowerCase().includes(q)) || 
            (i.author && i.author.toLowerCase().includes(q))
        )
    }, [items, searchQuery])

    const renderColumn = (status: ReadingStatus) => {
        const columnItems = filteredItems.filter(item => item.status === status)
        const totalInStatus = items.filter(item => item.status === status).length
        const { icon: Icon, color } = statusConfig[status]
        const label = t(`Status.${status}`)

        return (
            <div className="flex flex-col gap-4 w-full md:min-w-[300px] flex-1">
                <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl font-black border ${color} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm tracking-tight">{label}</span>
                    <span className="ms-auto bg-white/80 px-2.5 py-0.5 rounded-full text-xs font-mono font-black shadow-xs">
                        {searchQuery ? `${columnItems.length}/${totalInStatus}` : columnItems.length}
                    </span>
                </div>

                <div className="flex flex-col gap-3.5">
                    {columnItems.map(item => {
                        const total = item.totalPages || 0
                        const current = item.currentPage || 0
                        const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0
                        const isReading = item.status === ReadingStatus.READING

                        return (
                            <div 
                                key={item.id} 
                                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 relative group"
                            >
                                <div className="flex gap-4">
                                    <div className="relative w-16 h-24 shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-xs">
                                        {(() => {
                                            const rawImage = item.cover || item.book?.image
                                            const normalized = normalizeImage(rawImage)
                                            const isPlaceholder = normalized === '/book-placeholder.png'
                                            
                                            return !isPlaceholder ? (
                                                <Image
                                                    src={normalized}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/40">
                                                    <Book className="w-6 h-6 text-amber-300" />
                                                    <span className="text-[8px] font-black text-amber-700/60 mt-1 uppercase tracking-widest">{t('Board.Personal')}</span>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-black text-sm text-black truncate tracking-tight" title={item.title}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{item.author}</p>
                                            </div>

                                            {/* Actions Rapides Menu */}
                                            <div className="relative shrink-0">
                                                {confirmDeleteId !== item.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                                        className="p-1 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition"
                                                        aria-label="Actions"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Menu Déroulant Changement Statut */}
                                                {activeMenuId === item.id && (
                                                    <div className="absolute right-0 rtl:right-auto rtl:left-0 top-6 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                                                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-50">
                                                            {t('Board.ChangeStatus')}
                                                        </div>
                                                        {Object.values(ReadingStatus).map((st) => (
                                                            <button
                                                                key={st}
                                                                type="button"
                                                                onClick={() => handleUpdateStatus(item.id, st)}
                                                                className={`w-full text-left rtl:text-right px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition ${
                                                                    item.status === st ? 'font-black text-black' : 'text-gray-600'
                                                                }`}
                                                            >
                                                                <span>{t(`Status.${st}`)}</span>
                                                                {item.status === st && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-3">
                                            <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5 overflow-hidden shadow-inner">
                                                <div
                                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300 relative"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                                <span>{Math.round(progress)}%</span>
                                                <span className="font-mono">{current} / {total} p.</span>
                                            </div>
                                        </div>

                                        {/* Actions Rapides en bas de carte */}
                                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-50">
                                            {/* Boutons d'avancement rapide si EN COURS */}
                                            {isReading ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateProgress(item.id, Math.min(total, current + 10))}
                                                        disabled={total > 0 && current >= total}
                                                        className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-[10px] font-black border border-emerald-200/80 transition cursor-pointer disabled:opacity-40"
                                                    >
                                                        {t('Board.QuickStep10')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateProgress(item.id, Math.min(total, current + 25))}
                                                        disabled={total > 0 && current >= total}
                                                        className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-[10px] font-black border border-emerald-200/80 transition cursor-pointer disabled:opacity-40"
                                                    >
                                                        {t('Board.QuickStep25')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    {item.status !== ReadingStatus.READING && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(item.id, ReadingStatus.READING)}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                                                        >
                                                            {t('Board.Read')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="ms-auto flex items-center gap-1.5">
                                                {item.status !== ReadingStatus.COMPLETED && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(item.id, ReadingStatus.COMPLETED)}
                                                        className="p-1.5 hover:bg-green-50 text-green-700 rounded-lg transition active:scale-95 cursor-pointer"
                                                        title={t('Board.MarkFinished')}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Confirmation Inline Personnalisée (zéro window.confirm) */}
                                                {confirmDeleteId === item.id ? (
                                                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200 text-red-900 text-xs animate-in fade-in duration-150">
                                                        <span className="text-[10px] font-bold px-1">{t('Board.ConfirmDeleteQuestion')}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => executeDelete(item.id)}
                                                            className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 active:scale-95 transition cursor-pointer"
                                                        >
                                                            {t('Board.ConfirmYes')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-md hover:bg-gray-300 active:scale-95 transition cursor-pointer"
                                                        >
                                                            {t('Board.Cancel')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-600 rounded-lg transition cursor-pointer"
                                                        title={t('Board.Delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Saisie directe de page si en lecture */}
                                        {isReading && (
                                            <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                                                <span className="text-[11px] font-medium">{t('Board.CurrentPage')}</span>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={total || 9999}
                                                        value={current}
                                                        onChange={(e) => handleUpdateProgress(item.id, parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-0.5 text-xs font-mono font-bold border border-gray-200 rounded-md text-center focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                                                    />
                                                    <span className="text-[10px] text-gray-400">/ {total}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {columnItems.length === 0 && (
                        <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50 text-gray-400 space-y-3">
                            <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
                            <p className="text-xs font-bold text-gray-500">
                                {searchQuery ? t('Board.NoMatchingBooks') : t('Board.Empty')}
                            </p>
                            {!searchQuery && (
                                <Link
                                    href="/books"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition active:scale-95"
                                >
                                    <span>{t('Board.ExploreCatalog')}</span>
                                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Barre de Recherche et Filtre Interactive */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('Board.SearchPlaceholder')}
                        className="w-full ps-10 pe-9 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        {filteredItems.length} {filteredItems.length <= 1 ? 'livre' : 'livres'}
                    </span>
                </div>
            </div>

            {/* Navigation Tabs (Mobile Only) */}
            <div className="flex md:hidden bg-gray-100/90 p-1.5 rounded-2xl gap-1.5 backdrop-blur-sm sticky top-[72px] z-40 shadow-xs border border-white/60">
                {[ReadingStatus.TO_READ, ReadingStatus.READING, ReadingStatus.COMPLETED].map((status) => {
                    const { icon: Icon } = statusConfig[status]
                    const isActive = activeTab === status
                    const count = items.filter(i => i.status === status).length

                    return (
                        <button
                            key={status}
                            onClick={() => handleSelectTab(status)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                                isActive 
                                    ? 'bg-white text-black shadow-md shadow-black/5 scale-[1.02]' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <span className="truncate">{t(`Status.${status}`)}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-600">
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Card Generation Section */}
            <GenerateReadingCard user={user} items={items} />

            {/* Manual Add Button/Form */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                {children}
            </div>

            {/* Desktop Board / Mobile Active Column */}
            <div className="flex flex-col md:flex-row gap-6 items-start pb-10">
                <div className={`${activeTab === ReadingStatus.TO_READ ? 'flex' : 'hidden md:flex'} flex-col w-full`}>
                    {renderColumn(ReadingStatus.TO_READ)}
                </div>
                <div className={`${activeTab === ReadingStatus.READING ? 'flex' : 'hidden md:flex'} flex-col w-full`}>
                    {renderColumn(ReadingStatus.READING)}
                </div>
                <div className={`${activeTab === ReadingStatus.COMPLETED ? 'flex' : 'hidden md:flex'} flex-col w-full`}>
                    {renderColumn(ReadingStatus.COMPLETED)}
                </div>
            </div>
        </div>
    )
}
