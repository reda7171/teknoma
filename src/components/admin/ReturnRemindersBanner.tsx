'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, MessageCircle, Truck, ChevronDown, ChevronUp, Phone, Check } from 'lucide-react'
import { getPendingReturnReminders, updateReturnRecoveryStatus, updateShippingCompanySupportPhone, ReturnReminder } from '@/lib/actions/return-reminders'
import Link from 'next/link'

interface Props {
    locale: string
}

export default function ReturnRemindersBanner({ locale }: Props) {
    const [reminders, setReminders] = useState<ReturnReminder[]>([])
    const [loading, setLoading] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)
    const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
    const [phoneInput, setPhoneInput] = useState('')
    const [savingPhone, setSavingPhone] = useState(false)
    const [savingRecoveryId, setSavingRecoveryId] = useState<string | null>(null)

    useEffect(() => {
        getPendingReturnReminders()
            .then(data => {
                setReminders(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    if (loading || reminders.length === 0) return null

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const pendingCount = reminders.filter(reminder => reminder.isRecovered !== true).length

    const t = {
        title: isAr ? 'تذكير بالمرتجعات مع شركات التوصيل' : isEn ? 'Delivery Company Return Reminders' : 'Rappels de retours avec les sociétés de livraison',
        subtitle: isAr ? 'هذه الطلبات مسجلة كمرتجع منذ أكثر من أسبوع. تواصل مع شركة التوصيل لاسترداد الطرود.' : isEn ? 'These orders have been marked as returned for more than a week. Contact the delivery company to recover your packages.' : "Ces commandes sont marquées en retour depuis plus d'une semaine. Relancez le transporteur pour récupérer vos colis ou obtenir un état des lieux.",
        badge: isAr ? `${pendingCount} مرتجعات معلقة` : isEn ? `${pendingCount} pending returns` : `${pendingCount} ${pendingCount > 1 ? 'Retours en attente' : 'Retour en attente'}`,
        overdueTag: isAr ? '> 7 أيام بعد الطلب' : isEn ? '> 7 days after order' : '> 7 jours après commande',
        showBtn: (count: number) => isAr ? `عرض ${count} طرود` : isEn ? `View ${count} packages` : `Voir les ${count} colis`,
        hideBtn: isAr ? 'إخفاء القائمة' : isEn ? 'Hide list' : 'Masquer la liste',
        daysAgo: (days: number) => isAr ? `منذ ${days} يوم` : isEn ? `${days}d ago` : `Il y a ${days}j`,
        amount: isAr ? 'المبلغ :' : isEn ? 'Amount:' : 'Montant :',
        orderDetails: isAr ? 'تفاصيل الطلب ←' : isEn ? 'Order details →' : 'Détails de la commande →',
        waBtn: (comp: string) => `WhatsApp ${comp}`,
        recoveredQuestion: isAr ? 'هل تم استلام الطرد من شركة التوصيل؟' : isEn ? 'Recovered from the delivery company?' : 'Colis récupéré auprès du transporteur ?',
        recoveredYes: isAr ? 'نعم، تم الاستلام' : isEn ? 'Yes, recovered' : 'Oui, récupéré',
        recoveredNo: isAr ? 'لا، لا يزال معلقاً' : isEn ? 'No, still pending' : 'Non, toujours en attente'
    }

    const handleRecoveryChange = async (orderId: string, isRecovered: boolean) => {
        setSavingRecoveryId(orderId)
        const result = await updateReturnRecoveryStatus(orderId, isRecovered)
        if (result.success) {
            setReminders(previous => previous.map(reminder =>
                reminder.id === orderId ? { ...reminder, isRecovered } : reminder
            ))
        }
        setSavingRecoveryId(null)
    }

    const handleSavePhone = async (companyId: string) => {
        if (!phoneInput.trim()) return
        setSavingPhone(true)
        const res = await updateShippingCompanySupportPhone(companyId, phoneInput.trim())
        if (res.success) {
            setReminders(prev => prev.map(r => {
                if (r.shippingCompanyId === companyId) {
                    let clean = phoneInput.replace(/\D/g, '')
                    if (clean.startsWith('0')) clean = '212' + clean.slice(1)
                    else if (!clean.startsWith('212')) clean = '212' + clean
                    return {
                        ...r,
                        shippingCompanyPhone: phoneInput.trim(),
                        whatsappLink: `https://wa.me/${clean}?text=${encodeURIComponent(r.whatsappMessage)}`
                    }
                }
                return r
            }))
            setEditingPhoneId(null)
            setPhoneInput('')
        }
        setSavingPhone(false)
    }

    return (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-300 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                        <RotateCcw className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white">
                                {t.badge}
                            </span>
                            <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                {t.overdueTag}
                            </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                            {t.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">
                            {t.subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all"
                    >
                        <span>{isExpanded ? t.hideBtn : t.showBtn(reminders.length)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Liste déroulante des retours */}
            {isExpanded && (
                <div className="mt-5 pt-5 border-t border-amber-200/80 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {reminders.map(order => (
                            <div key={order.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all ${order.isRecovered ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-amber-400'}`}>
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-800">
                                            <Truck className="w-3.5 h-3.5 text-amber-600" />
                                            {order.shippingCompanyName}
                                        </span>
                                        <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                            {t.daysAgo(order.daysSinceOrder)}
                                        </span>
                                    </div>

                                    <div className="space-y-1 mb-3">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                            {order.trackingID ? `Suivi : ${order.trackingID}` : `Commande #${order.id.slice(0, 8)}`}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 truncate">
                                            {order.fullName} — {order.city}
                                        </p>
                                        <p className="text-xs font-bold text-slate-600">
                                            {t.amount} <span className="font-black text-slate-900">{order.total} DH</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                                    <fieldset disabled={savingRecoveryId === order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 disabled:opacity-60">
                                        <legend className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                                            {t.recoveredQuestion}
                                        </legend>
                                        <div className="mt-1 grid grid-cols-1 gap-1.5">
                                            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${order.isRecovered === true ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input
                                                    type="radio"
                                                    name={`return-recovered-${order.id}`}
                                                    checked={order.isRecovered === true}
                                                    onChange={() => handleRecoveryChange(order.id, true)}
                                                    className="accent-emerald-600"
                                                />
                                                {t.recoveredYes}
                                            </label>
                                            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${order.isRecovered === false ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                <input
                                                    type="radio"
                                                    name={`return-recovered-${order.id}`}
                                                    checked={order.isRecovered === false}
                                                    onChange={() => handleRecoveryChange(order.id, false)}
                                                    className="accent-amber-600"
                                                />
                                                {t.recoveredNo}
                                            </label>
                                        </div>
                                    </fieldset>

                                    {order.shippingCompanyPhone ? (
                                        <a
                                            href={order.whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>WhatsApp {order.shippingCompanyName}</span>
                                        </a>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {editingPhoneId === order.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: 0655123456"
                                                        value={phoneInput}
                                                        onChange={(e) => setPhoneInput(e.target.value)}
                                                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                                                    />
                                                    <button
                                                        onClick={() => order.shippingCompanyId && handleSavePhone(order.shippingCompanyId)}
                                                        disabled={savingPhone}
                                                        className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <a
                                                        href={order.whatsappLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wider transition-all"
                                                        title="Ouvrir WhatsApp avec le message pré-rempli"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WhatsApp Transporteur</span>
                                                    </a>
                                                    {order.shippingCompanyId && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingPhoneId(order.id)
                                                                setPhoneInput(order.shippingCompanyPhone || '')
                                                            }}
                                                            className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                                                            title="Ajouter le numéro WhatsApp de cette société"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Link
                                        href={`/${locale}/admin/orders/${order.id}`}
                                        className="text-center text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:underline"
                                    >
                                        {t.orderDetails}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
