'use client'

import { useState, useTransition, useMemo } from 'react'
import { acceptExchange, rejectExchange, completeExchange } from '@/lib/actions/community-exchanges'
import { Link, useRouter } from '@/i18n/routing'
import { fbCustomEvents } from '@/lib/facebook-pixel'
import { useTranslations, useLocale } from 'next-intl'
import { 
    BookOpen, Check, X, Clock, CheckCircle, Loader2, RefreshCw, 
    MessageSquare, Flag, Star, MapPin, Phone, MessageCircle, 
    ArrowLeftRight, Calendar, Inbox, Send, ShieldCheck
} from 'lucide-react'
import RatingModal from './RatingModal'
import ConfirmationModal from './ConfirmationModal'
import DonationModal from './DonationModal'
import { useUIStore } from '@/store/ui'
import { normalizeImage } from '@/lib/utils'

interface Exchange {
    id: string
    type: string
    status: string
    message: string | null
    createdAt: Date | string
    requester?: { fullName: string | null; rating: number; city: string | null; phone?: string | null }
    responder?: { fullName: string | null; rating: number; city: string | null; phone?: string | null }
    bookRequested: { title: string; author: string; image: string | null }
    bookOffered: { title: string; author: string; image: string | null } | null
    deliveryMethod?: string | null
    meetingPoint?: string | null
    meetingDate?: Date | string | null
    rating?: any | null
    _dir?: 'received' | 'sent'
}

interface ExchangesListProps {
    received?: Exchange[]
    sent?: Exchange[]
    exchanges?: Exchange[]
    type?: 'received' | 'sent'
}

export default function ExchangesList({ 
    received: rawReceived = [], 
    sent: rawSent = [], 
    exchanges: legacyExchanges, 
    type: legacyType 
}: ExchangesListProps) {
    const router = useRouter()
    const locale = useLocale()
    const isAr = locale === 'ar'
    const { showNotification } = useUIStore()
    const t = useTranslations('Community.Exchanges')

    const [loading, setLoading] = useState<string | null>(null)
    const [ratingModalOpen, setRatingModalOpen] = useState(false)
    const [ratingExchangeId, setRatingExchangeId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // Filter and Tab state
    const [activeTab, setActiveTab] = useState<'all' | 'received' | 'sent'>(legacyType || 'all')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'COMPLETED'>('ALL')

    // Confirmation Modal State
    const [confirmAction, setConfirmAction] = useState<{
        id: string | null
        type: 'REJECT' | 'COMPLETE' | null
    }>({ id: null, type: null })

    const [showDonationModal, setShowDonationModal] = useState(false)

    // Normalize incoming items
    const receivedItems = useMemo(() => {
        if (legacyType === 'received' && legacyExchanges) {
            return legacyExchanges.map(e => ({ ...e, _dir: 'received' as const }))
        }
        return rawReceived.map(e => ({ ...e, _dir: 'received' as const }))
    }, [rawReceived, legacyExchanges, legacyType])

    const sentItems = useMemo(() => {
        if (legacyType === 'sent' && legacyExchanges) {
            return legacyExchanges.map(e => ({ ...e, _dir: 'sent' as const }))
        }
        return rawSent.map(e => ({ ...e, _dir: 'sent' as const }))
    }, [rawSent, legacyExchanges, legacyType])

    // Combined & Filtered items
    const displayedExchanges = useMemo(() => {
        let pool: (Exchange & { _dir: 'received' | 'sent' })[] = []
        if (activeTab === 'all') {
            pool = [...receivedItems, ...sentItems].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        } else if (activeTab === 'received') {
            pool = receivedItems
        } else {
            pool = sentItems
        }

        if (statusFilter === 'ALL') {
            return pool
        }
        return pool.filter(e => e.status === statusFilter)
    }, [activeTab, statusFilter, receivedItems, sentItems])

    const handleConfirmAction = async () => {
        const { id, type } = confirmAction
        if (!id || !type) return

        setLoading(id)

        startTransition(async () => {
            try {
                const res = type === 'REJECT' ? await rejectExchange(id) : await completeExchange(id)

                if (res.success) {
                    showNotification(type === 'REJECT' ? t('Status.REJECTED') : t('Status.COMPLETED'), 'success')
                    router.refresh()

                    if (type === 'COMPLETE') {
                        fbCustomEvents.exchangeCompleted(id)
                        setTimeout(() => setShowDonationModal(true), 500)
                    }
                } else {
                    showNotification(res.error || 'Erreur', 'error')
                }
            } catch (err) {
                showNotification('Une erreur est survenue', 'error')
            } finally {
                setLoading(null)
                setConfirmAction({ id: null, type: null })
            }
        })
    }

    async function handleAccept(exchangeId: string) {
        setLoading(exchangeId)
        try {
            const res = await acceptExchange(exchangeId)
            if (res.success) {
                showNotification(t('Status.ACCEPTED'), 'success')
                startTransition(() => {
                    router.refresh()
                })
            } else {
                showNotification(res.error || 'Erreur', 'error')
            }
        } catch (e) {
            showNotification('Une erreur est survenue', 'error')
        } finally {
            setLoading(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {t('Status.PENDING')}
                    </span>
                )
            case 'ACCEPTED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                        {t('Status.ACCEPTED')}
                    </span>
                )
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {t('Status.COMPLETED')}
                    </span>
                )
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full">
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        {t('Status.REJECTED')}
                    </span>
                )
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-full">
                        <X className="w-3.5 h-3.5 text-gray-500" />
                        {t('Status.CANCELLED')}
                    </span>
                )
            default:
                return null
        }
    }

    const buildWhatsAppUrl = (phone: string | null | undefined, bookTitle: string) => {
        if (!phone) return null
        let clean = phone.replace(/\D/g, '')
        if (clean.startsWith('0')) {
            clean = '212' + clean.slice(1)
        } else if (!clean.startsWith('212') && clean.length === 9) {
            clean = '212' + clean
        }
        const text = isAr
            ? `مرحباً، بخصوص تبادل كتاب "${bookTitle}" على منصة رواية.`
            : `Bonjour, concernant l'échange du livre "${bookTitle}" sur la plateforme Riwaya.`
        return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
    }

    const totalCount = receivedItems.length + sentItems.length

    return (
        <div className="space-y-6">
            {/* Navigation Tabs and Status Filters Bar */}
            <div className="bg-white rounded-3xl p-3 md:p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Segmented Direction Tabs */}
                <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === 'all'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-600 hover:text-black hover:bg-white/60'
                        }`}
                    >
                        <span>{t('All')}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                            {totalCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === 'received'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-600 hover:text-black hover:bg-white/60'
                        }`}
                    >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>{t('Received')}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            activeTab === 'received' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                            {receivedItems.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === 'sent'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-600 hover:text-black hover:bg-white/60'
                        }`}
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('Sent')}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                            {sentItems.length}
                        </span>
                    </button>
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {(['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED'] as const).map(status => {
                        const labelKey = status === 'ALL' ? 'FilterAll' : status === 'PENDING' ? 'FilterPending' : status === 'ACCEPTED' ? 'FilterAccepted' : 'FilterCompleted'
                        const isActive = statusFilter === status
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-amber-400 text-black shadow-sm font-black'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-black'
                                }`}
                            >
                                {t(labelKey)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Empty State */}
            {displayedExchanges.length === 0 && (
                <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 text-amber-600">
                        <RefreshCw className="w-9 h-9" />
                    </div>
                    <h3 className="font-black text-2xl text-black mb-2 tracking-tight">
                        {statusFilter !== 'ALL' 
                            ? t('NoExchanges') 
                            : activeTab === 'received' 
                                ? t('EmptyReceived') 
                                : activeTab === 'sent' 
                                    ? t('EmptySent') 
                                    : t('NoExchanges')}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md mb-6 leading-relaxed">
                        {t('Subtitle')}
                    </p>
                    <Link
                        href="/community/market"
                        className="inline-flex items-center gap-2 bg-black text-white hover:bg-gray-800 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>{t('ExploreMarket')}</span>
                    </Link>
                </div>
            )}

            {/* List of Exchanges */}
            <div className="grid grid-cols-1 gap-6">
                {displayedExchanges.map(exchange => {
                    const isReceived = exchange._dir === 'received'
                    const partner = isReceived ? exchange.requester : exchange.responder
                    const whatsappUrl = buildWhatsAppUrl(partner?.phone, exchange.bookRequested.title)
                    const formattedDate = new Date(exchange.createdAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })

                    return (
                        <div
                            key={exchange.id}
                            className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                        >
                            {/* Card Top Banner */}
                            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Direction Pill */}
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                                        isReceived 
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-200 text-gray-800'
                                    }`}>
                                        {isReceived ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                                        {isReceived ? t('DirectionReceived') : t('DirectionSent')}
                                    </span>

                                    {/* Status Pill */}
                                    {getStatusBadge(exchange.status)}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{formattedDate}</span>
                                </div>
                            </div>

                            {/* Partner & Logistics Info */}
                            <div className="p-4 sm:p-6 border-b border-gray-100/70 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 bg-amber-400 text-black rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 border-2 border-white">
                                        {partner?.fullName?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-black text-base text-black truncate max-w-[200px] sm:max-w-xs">
                                                {partner?.fullName || t('UserMenu.DefaultUser')}
                                            </h4>
                                            {typeof partner?.rating === 'number' && partner.rating > 0 && (
                                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                    {partner.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            {partner?.city && (
                                                <span className="inline-flex items-center gap-1 font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    {partner.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Direct Contact Channels */}
                                <div className="flex items-center gap-2">
                                    {whatsappUrl && (
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                                            title="WhatsApp"
                                            aria-label={t('ContactWhatsApp')}
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>{t('ContactWhatsApp')}</span>
                                        </a>
                                    )}
                                    {partner?.phone && (
                                        <a
                                            href={`tel:${partner.phone}`}
                                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-all"
                                            title={t('Call')}
                                            aria-label={t('Call')}
                                        >
                                            <Phone className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Book Swap Matchup */}
                            <div className="p-4 sm:p-6 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                                    {/* Book 1: Requested */}
                                    <div className="md:col-span-5 bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                                        <div className="w-14 h-20 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm relative">
                                            <img
                                                src={normalizeImage(exchange.bookRequested.image)}
                                                alt={exchange.bookRequested.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mb-1">
                                                {t('Requested')}
                                            </span>
                                            <h5 className="font-black text-sm text-black truncate" title={exchange.bookRequested.title}>
                                                {exchange.bookRequested.title}
                                            </h5>
                                            <p className="text-xs text-gray-500 truncate">{exchange.bookRequested.author}</p>
                                        </div>
                                    </div>

                                    {/* Swap Direction Icon */}
                                    <div className="md:col-span-1 flex justify-center">
                                        <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-sm">
                                            <ArrowLeftRight className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Book 2: Offered / Credits */}
                                    <div className="md:col-span-5 bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex items-center gap-3.5">
                                        {exchange.bookOffered ? (
                                            <>
                                                <div className="w-14 h-20 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm relative">
                                                    <img
                                                        src={normalizeImage(exchange.bookOffered.image)}
                                                        alt={exchange.bookOffered.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
                                                        {t('Offered')}
                                                    </span>
                                                    <h5 className="font-black text-sm text-black truncate" title={exchange.bookOffered.title}>
                                                        {exchange.bookOffered.title}
                                                    </h5>
                                                    <p className="text-xs text-gray-500 truncate">{exchange.bookOffered.author}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-3 w-full py-3">
                                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                                    <Star className="w-6 h-6 fill-amber-500" />
                                                </div>
                                                <div>
                                                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mb-1">
                                                        {t('Credits')}
                                                    </span>
                                                    <h5 className="font-black text-sm text-black">
                                                        {t('Credits')}
                                                    </h5>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Meeting Details */}
                                {(exchange.meetingPoint || exchange.meetingDate) && (
                                    <div className="mt-4 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/50 flex flex-wrap items-center gap-4 text-xs">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-900">
                                            {t('MeetingDetails')}:
                                        </span>
                                        {exchange.meetingPoint && (
                                            <span className="inline-flex items-center gap-1.5 font-bold text-gray-800">
                                                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                                {exchange.meetingPoint}
                                            </span>
                                        )}
                                        {exchange.meetingDate && (
                                            <span className="inline-flex items-center gap-1.5 font-bold text-gray-800">
                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                {new Date(exchange.meetingDate).toLocaleString(locale, {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* User message note */}
                                {exchange.message && (
                                    <div className="mt-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-2.5">
                                        <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-gray-600 italic leading-relaxed">
                                            &ldquo;{exchange.message}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Card Actions Footer */}
                            {/* 1. Received + Pending Actions */}
                            {isReceived && exchange.status === 'PENDING' && (
                                <div className="p-4 sm:p-5 pt-0 flex gap-3 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction({ id: exchange.id, type: 'REJECT' })}
                                        disabled={loading === exchange.id}
                                        className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        <span>{t('Actions.Reject')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAccept(exchange.id)}
                                        disabled={loading === exchange.id}
                                        className="flex-1 bg-black text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {loading === exchange.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 text-emerald-400" />
                                                <span>{t('Actions.Accept')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* 2. Accepted: Chat + Finish */}
                            {exchange.status === 'ACCEPTED' && (
                                <div className="p-4 sm:p-5 pt-0 flex gap-3 bg-white">
                                    <Link
                                        href={`/community/exchanges/${exchange.id}/chat`}
                                        className="flex-1 bg-white border border-black text-black py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>{t('ChatButton')}</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction({ id: exchange.id, type: 'COMPLETE' })}
                                        disabled={loading === exchange.id}
                                        className="flex-1 bg-black text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading === exchange.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Flag className="w-4 h-4 text-amber-400" />
                                                <span>{t('FinishButton')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* 3. Completed: Chat history + Rating */}
                            {exchange.status === 'COMPLETED' && (
                                <div className="p-4 sm:p-5 pt-0 flex flex-wrap items-center gap-3 bg-white">
                                    <Link
                                        href={`/community/exchanges/${exchange.id}/chat`}
                                        className="flex-1 min-w-[140px] bg-gray-100 text-gray-700 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4 text-gray-500" />
                                        <span>{t('HistoryChat')}</span>
                                    </Link>

                                    {exchange.rating ? (
                                        <div className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 py-3 rounded-2xl">
                                            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                            <span className="text-xs font-black uppercase tracking-wider">
                                                {exchange.rating.rating} / 5
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                startTransition(() => {
                                                    setRatingExchangeId(exchange.id)
                                                    setRatingModalOpen(true)
                                                })
                                            }}
                                            className="flex-1 min-w-[140px] bg-amber-400 hover:bg-amber-500 text-black py-3 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Star className="w-4 h-4 fill-black" />
                                            <span>{t('RateExchange')}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Modals */}
            {ratingExchangeId && (
                <RatingModal
                    exchangeId={ratingExchangeId}
                    isOpen={ratingModalOpen}
                    onClose={() => {
                        setRatingModalOpen(false)
                        setRatingExchangeId(null)
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={!!confirmAction.id}
                title={confirmAction.type === 'REJECT' ? t('Actions.Reject') : t('FinishButton')}
                message={
                    confirmAction.type === 'REJECT'
                        ? (isAr ? "هل أنت متأكد من رفض هذا الطلب؟" : "Êtes-vous sûr de vouloir refuser cet échange ?")
                        : (isAr ? "هل تريد وضع علامة على هذا التبادل كمكتمل؟" : "Voulez-vous marquer cet échange comme terminé ?")
                }
                variant={confirmAction.type === 'REJECT' ? 'danger' : 'info'}
                onConfirm={handleConfirmAction}
                onClose={() => setConfirmAction({ id: null, type: null })}
                confirmText={isAr ? "نعم" : "Oui"}
                cancelText={isAr ? "إلغاء" : "Annuler"}
            />

            <DonationModal
                isOpen={showDonationModal}
                onClose={() => setShowDonationModal(false)}
            />
        </div>
    )
}
