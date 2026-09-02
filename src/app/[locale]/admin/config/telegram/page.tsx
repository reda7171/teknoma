import { verifyAdmin } from '@/lib/actions/auth'
import { getSetting } from '@/lib/actions/site-settings'
import { redirect } from 'next/navigation'
import TelegramConfigForm from './TelegramConfigForm'
import { MessageCircle } from 'lucide-react'

export const metadata = {
    title: 'Configuration Telegram | Admin Riwaya',
}

export const dynamic = 'force-dynamic'

export default async function TelegramConfigPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }

    const botToken = await getSetting('telegram_bot_token') || ''
    const chatId = await getSetting('telegram_chat_id') || ''

    // Nouveaux paramètres de notification
    const settings = {
        notifyOrders: await getSetting('telegram_notify_orders') !== 'false', // Défaut true
        notifyHomeVisit: await getSetting('telegram_notify_home_visit') === 'true',
        notifySearch: await getSetting('telegram_notify_search') === 'true',
        notifyCart: await getSetting('telegram_notify_cart') === 'true',
        notifyRegister: await getSetting('telegram_notify_register') === 'true',
        notifyChat: await getSetting('telegram_notify_chat') === 'true',
        notifyLowStock: await getSetting('telegram_notify_low_stock') !== 'false', // Défaut true
        notifyArticleRead: await getSetting('telegram_notify_article_read') !== 'false', // Défaut true
        notifyDailySummary: await getSetting('telegram_notify_daily_summary') !== 'false', // Défaut true
        notifyReviews: await getSetting('telegram_notify_reviews') !== 'false', // Défaut true
        notifyJumiaPayout: await getSetting('telegram_notify_jumia_payout') === 'true', // Défaut false
        notifyInvoices: await getSetting('telegram_notify_invoices') === 'true', // Défaut false
        notifyBookVisits: await getSetting('telegram_notify_book_visits') === 'true', // Défaut false
        statsVisitors: await getSetting('telegram_stats_visitors') === 'true',
        statsRegistrations: await getSetting('telegram_stats_registrations') === 'true',
        statsTopViews: await getSetting('telegram_stats_top_views') === 'true',
        instagramId: await getSetting('marketing_instagram_id') || '',
        facebookPageId: await getSetting('marketing_facebook_page_id') || '',
        // Nouveaux templates de messages
        templateOrder: await getSetting('telegram_template_order') || `🛒 <b>Nouvelle Commande #{{shortId}}</b>\n\n👤 <b>Client:</b> {{fullName}}\n📱 <b>Source:</b> {{source}}\n📞 <b>Téléphone:</b> {{phone}}\n📍 <b>Ville (Saisie):</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n💰 <b>Total:</b> {{total}} درهم\n{{comment}}\n{{itemsList}}\n🌐 <b>IP:</b> {{ip}}\n\n🔗 <a href="{{orderUrl}}">Voir la commande</a>`,
        templateRegister: await getSetting('telegram_template_register') || `👤 <b>Nouveau Compte Créé</b>\n\n📛 <b>Nom:</b> {{fullName}}\n📧 <b>Email:</b> {{email}}\n{{phone}}📍 <b>Ville:</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n🔑 <b>Rôle:</b> {{role}}\n🌐 <b>IP:</b> {{ip}}\n📅 <b>Date:</b> {{date}}`,
        templateReview: await getSetting('telegram_template_review') || `⭐ <b>Nouvel Avis Client</b>\n\n👤 <b>Client:</b> {{fullName}}\n⭐ <b>Note:</b> {{rating}}/5\n💬 <b>Message:</b> <i>{{comment}}</i>\n\n📥 <i>Action requise :</i>`,
        templateLowStock: await getSetting('telegram_template_low_stock') || `⚠️ <b>Alerte Stock Faible</b>\n\n📖 <b>Livre:</b> {{title}}\n📦 <b>Stock restant:</b> <b>{{stock}}</b>\n\n<i>Action rapide disponible :</i>`,
        templateArticleRead: await getSetting('telegram_template_article_read') || `📖 <b>Nouvelle lecture d'article !</b>\n\n📌 <b>Titre:</b> {{title}}\n👁️ <b>Vues totales:</b> {{viewCount}}\n🌍 <b>Pays:</b> {{country}}`,
        templateWhatsapp: await getSetting('whatsapp_template_order') || `Bonjour {{fullName}},\n\nVotre commande #{{shortId}} sur Riwaya a bien été reçue. Nous préparons votre colis pour une livraison rapide à {{city}}.\n\nMerci de votre confiance ! 📚✨`,
    }

    const webhookBaseUrl = await getSetting('telegram_webhook_base_url') || ''
    const appUrl = webhookBaseUrl || (await getSetting('site_url')) || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Telegram<span className="text-blue-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Notifications instantanées & modération mobile
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-black tracking-tight uppercase">Telegram Bot Core</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Tokens d'API et paramètres de notifications</p>
                        </div>
                    </div>
                    <TelegramConfigForm
                        initialBotToken={botToken}
                        initialChatId={chatId}
                        appUrl={appUrl}
                        initialSettings={settings}
                    />
                </div>
            </div>
        </div>
    )
}
