'use client'

import { useState } from 'react'
import { MessageSquare, X, MessageCircle, Mail, Filter } from 'lucide-react'

const getNotificationLinks = (order: any, lang: 'fr' | 'ar' | 'en' = 'fr', filterType?: string) => {
    const trackingLink = `https://petsunivers.ma/${lang}/track/${order.id}`
    let text = ''
    let subject = 'Suivi de votre commande PetsUnivers'

    const isEncouragement = filterType === 'ENCOURAGEMENT' && order.status === 'DELIVERED'

    if (lang === 'fr') {
        if (isEncouragement) {
            subject = 'Merci pour votre confiance ! Cadeau exclusif 🎁'
            text = `Bonjour ${order.fullName},\n\nNous espérons que vous avez apprécié votre dernière lecture avec PetsUnivers ! 📚\n\nPour vous remercier de votre confiance, nous vous offrons le code promo exclusif : *REVIENS20*\n\nUtilisez-le lors de votre prochaine commande pour profiter d'une réduction spéciale. N'hésitez pas à jeter un œil à nos nouveautés !\n\nL'équipe PetsUnivers.`
        } else {
        switch (order.status) {
            case 'PENDING':
                text = `Bonjour ${order.fullName}, nous avons bien reçu votre commande sur PetsUnivers ! Vous pouvez suivre son avancement ici : ${trackingLink}`
                break
            case 'ABANDONED_CART':
                subject = `Finalisez votre commande et profitez de -20 DHS offerts ! 🎁`
                text = `Bonjour ${order.fullName},\n\nNous avons remarqué que vous n'avez pas terminé votre commande sur PetsUnivers.\n\nPour vous remercier de votre visite et vous encourager dans votre lecture, nous vous offrons une remise exceptionnelle de -20 DHS sur votre panier !\n\nAvez-vous besoin d'aide avec un livre ou le paiement à la livraison ? N'hésitez pas à nous répondre.\n\nL'équipe PetsUnivers.`
                break
            case 'CONFIRMED':
                text = `Bonjour ${order.fullName}, votre commande PetsUnivers est confirmée et en cours de préparation. Suivi : ${trackingLink}`
                break
            case 'SHIPPED':
                text = `Bonne nouvelle ${order.fullName}, votre commande a été expédiée${order.shippingCompanyName ? ` avec ${order.shippingCompanyName}` : ''}${order.trackingID ? ` (Suivi: ${order.trackingID})` : ''} ! Lien : ${trackingLink}`
                break
            case 'DELIVERED':
                text = `Bonjour ${order.fullName}, votre commande a été livrée ! Bonne lecture et n'hésitez pas à nous laisser un avis.`
                break
            case 'RETURNED':
                text = `Bonjour ${order.fullName}, nous vous informons que votre commande a été marquée comme retournée.`
                break
            case 'CANCELLED':
                text = `Bonjour ${order.fullName}, votre commande a été annulée. Si c'est une erreur, n'hésitez pas à nous contacter.`
                break
            default:
                text = `Bonjour ${order.fullName}, voici le lien de suivi de votre commande PetsUnivers : ${trackingLink}`
        }
        }
    } else if (lang === 'ar') {
        subject = 'تتبع طلبك من PetsUnivers'
        if (isEncouragement) {
            subject = 'شكراً لثقتكم! هدية حصرية 🎁'
            text = `مرحباً ${order.fullName}،\n\nنأمل أن تكونوا قد استمتعتم بقراءتكم الأخيرة مع PetsUnivers! 📚\n\nلشكركم على ثقتكم، نقدم لكم كود الخصم الحصري: *REVIENS20*\n\nاستخدموه في طلبكم القادم للاستفادة من تخفيض خاص. لا تترددوا في الاطلاع على جديدنا!\n\nفريق PetsUnivers.`
        } else {
        switch (order.status) {
            case 'PENDING':
                text = `مرحباً ${order.fullName}، لقد توصلنا بطلبك على PetsUnivers! يمكنك تتبع حالته هنا: ${trackingLink}`
                break
            case 'ABANDONED_CART':
                subject = `أكمل طلبك واستفد من خصم 20 درهم! 🎁`
                text = `مرحباً ${order.fullName}،\n\nلاحظنا أنك لم تكمل طلبك على PetsUnivers.\n\nلشكرك على زيارتك وتشجيعك على القراءة، نقدم لك خصماً استثنائياً بقيمة 20 درهم على سلتك!\n\nهل تحتاج إلى مساعدة بخصوص كتاب أو الدفع عند الاستلام؟ لا تتردد في الرد علينا.\n\nفريق PetsUnivers.`
                break
            case 'CONFIRMED':
                text = `مرحباً ${order.fullName}، تم تأكيد طلبك وهو قيد التحضير. التتبع: ${trackingLink}`
                break
            case 'SHIPPED':
                text = `خبر سار ${order.fullName}، تم شحن طلبك${order.shippingCompanyName ? ` مع ${order.shippingCompanyName}` : ''}${order.trackingID ? ` (تتبع: ${order.trackingID})` : ''}! الرابط: ${trackingLink}`
                break
            case 'DELIVERED':
                text = `مرحباً ${order.fullName}، تم توصيل طلبك! قراءة ممتعة ولا تتردد في ترك تقييم.`
                break
            case 'RETURNED':
                text = `مرحباً ${order.fullName}، نعلمك أنه تم تمييز طلبك كمرتجع.`
                break
            case 'CANCELLED':
                text = `مرحباً ${order.fullName}، تم إلغاء طلبك. إذا كان هذا خطأ، لا تتردد في الاتصال بنا.`
                break
            default:
                text = `مرحباً ${order.fullName}، إليك رابط تتبع طلبك من PetsUnivers: ${trackingLink}`
        }
        }
    } else if (lang === 'en') {
        subject = 'Track your PetsUnivers order'
        if (isEncouragement) {
            subject = 'Thank you for your trust! Exclusive gift 🎁'
            text = `Hello ${order.fullName},\n\nWe hope you enjoyed your recent read with PetsUnivers! 📚\n\nTo thank you for your trust, we are offering you an exclusive promo code: *REVIENS20*\n\nUse it on your next order to enjoy a special discount. Feel free to check out our new arrivals!\n\nThe PetsUnivers team.`
        } else {
        switch (order.status) {
            case 'PENDING':
                text = `Hello ${order.fullName}, we have received your order on PetsUnivers! You can track its progress here: ${trackingLink}`
                break
            case 'ABANDONED_CART':
                subject = `Complete your order and get 20 DHS off! 🎁`
                text = `Hello ${order.fullName},\n\nWe noticed you didn't complete your order on PetsUnivers.\n\nTo thank you for your visit and encourage your reading, we are offering you an exceptional discount of 20 DHS on your cart!\n\nDo you need help with a book or cash on delivery? Don't hesitate to reply.\n\nThe PetsUnivers team.`
                break
            case 'CONFIRMED':
                text = `Hello ${order.fullName}, your PetsUnivers order is confirmed and being prepared. Tracking: ${trackingLink}`
                break
            case 'SHIPPED':
                text = `Good news ${order.fullName}, your order has been shipped${order.shippingCompanyName ? ` with ${order.shippingCompanyName}` : ''}${order.trackingID ? ` (Tracking: ${order.trackingID})` : ''}! Link: ${trackingLink}`
                break
            case 'DELIVERED':
                text = `Hello ${order.fullName}, your order has been delivered! Happy reading and feel free to leave a review.`
                break
            case 'RETURNED':
                text = `Hello ${order.fullName}, we inform you that your order has been marked as returned.`
                break
            case 'CANCELLED':
                text = `Hello ${order.fullName}, your order has been cancelled. If this is a mistake, please contact us.`
                break
            default:
                text = `Hello ${order.fullName}, here is the tracking link for your PetsUnivers order: ${trackingLink}`
        }
        }
    }

    const phone = order.phone.replace(/^0+/, '').replace(/\s+/g, '')
    const waLink = `https://wa.me/212${phone}?text=${encodeURIComponent(text)}`
    const mailLink = order.email ? `mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null

    return { waLink, mailLink, text }
}

export default function NotificationCenterButton({ orders, statusLabels }: { orders: any[], statusLabels: any }) {
    const [showModal, setShowModal] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [notificationLang, setNotificationLang] = useState<'fr' | 'ar' | 'en'>('fr')

    const filteredOrders = filterStatus === 'ALL'
        ? orders
        : filterStatus === 'ENCOURAGEMENT'
            ? orders.filter(o => o.status === 'DELIVERED')
            : orders.filter(o => o.status === filterStatus)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-sm"
                title="Notifier les clients"
            >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Notifier Clients</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Centre de Notifications</h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Envoyez rapidement des messages de suivi à vos clients
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {filteredOrders.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm(`Attention : Votre navigateur risque de bloquer l'ouverture de multiples onglets. Veuillez autoriser les pop-ups pour ce site.\n\nVoulez-vous ouvrir WhatsApp pour ces ${filteredOrders.length} clients ?`)) {
                                                filteredOrders.forEach((order: any) => {
                                                    const { waLink } = getNotificationLinks(order, notificationLang, filterStatus)
                                                    window.open(waLink, '_blank')
                                                })
                                            }
                                        }}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Envoyer à tous</span>
                                    </button>
                                )}
                                <select
                                    value={notificationLang}
                                    onChange={(e) => setNotificationLang(e.target.value as 'fr' | 'ar' | 'en')}
                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                >
                                    <option value="fr">🇫🇷 Français</option>
                                    <option value="ar">🇲🇦 العربية</option>
                                    <option value="en">🇬🇧 English</option>
                                </select>
                                <button onClick={() => setShowModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400 mr-2" />
                            <button
                                onClick={() => setFilterStatus('ALL')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                Toutes
                            </button>
                            <button
                                onClick={() => setFilterStatus('ENCOURAGEMENT')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filterStatus === 'ENCOURAGEMENT' ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'}`}
                            >
                                🎁 Encouragement
                            </button>
                            {Object.entries(statusLabels).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === key ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {label as string}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                            {filteredOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredOrders.map((order: any, idx: number) => {
                                        const { waLink, mailLink, text } = getNotificationLinks(order, notificationLang, filterStatus)
                                        return (
                                            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 hover:border-green-200 transition-colors">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-black text-gray-900">{order.fullName}</span>
                                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                                {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium font-mono">{order.id.split('-')[0].toUpperCase()} • {order.phone}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <a
                                                            href={waLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                            WhatsApp
                                                        </a>
                                                        {mailLink && (
                                                            <a
                                                                href={mailLink}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                                                                title="Envoyer un email"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                                Email
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <p className="text-xs text-gray-600 italic">"{text}"</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h4 className="text-gray-900 font-bold mb-1">Aucune commande</h4>
                                    <p className="text-gray-500 text-sm">Il n'y a aucune commande dans cette catégorie.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
