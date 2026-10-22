import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/actions/auth'
import {
    getWhatsAppGatewayStatus,
    getWhatsAppGatewaySettings,
    getWhatsAppTemplates,
    getWhatsAppMessageLogs,
    getWahaSessions
} from '@/lib/actions/whatsapp-gateway'
import { WhatsAppGatewayClient } from '@/components/admin/WhatsAppGatewayClient'

export const metadata = { title: 'Passerelle WhatsApp QR & Sessions | Admin Riwaya' }

export default async function WhatsAppGatewayPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const [statusData, settings, templates, initialLogsData, initialSessionsData] = await Promise.all([
        getWhatsAppGatewayStatus(),
        getWhatsAppGatewaySettings(),
        getWhatsAppTemplates(),
        getWhatsAppMessageLogs({ limit: 50 }),
        getWahaSessions()
    ])

    return (
        <div className="space-y-10 max-w-5xl mx-auto">
            {/* En-tête */}
            <div className="pb-6 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        WhatsApp QR<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Passerelle WhatsApp Gratuite · Contrôle des Sessions WAHA · Traçage des Messages
                    </p>
                </div>
            </div>

            <WhatsAppGatewayClient
                initialStatus={statusData}
                initialSettings={settings}
                initialTemplates={templates}
                initialLogsData={initialLogsData}
                initialSessions={initialSessionsData.sessions || []}
            />
        </div>
    )
}
