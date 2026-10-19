import { getWhatsAppGatewayStatus, getWhatsAppGatewaySettings, getWhatsAppTemplates } from '@/lib/actions/whatsapp-gateway'
import { WhatsAppGatewayClient } from '@/components/admin/WhatsAppGatewayClient'

export const metadata = { title: 'Passerelle WhatsApp QR | Admin Riwaya' }

export default async function WhatsAppGatewayPage() {
    const [statusData, settings, templates] = await Promise.all([
        getWhatsAppGatewayStatus(),
        getWhatsAppGatewaySettings(),
        getWhatsAppTemplates()
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
                        Passerelle WhatsApp Gratuite · Connexion Multi-Device · Relances Automatiques
                    </p>
                </div>
            </div>

            <WhatsAppGatewayClient
                initialStatus={statusData}
                initialSettings={settings}
                initialTemplates={templates}
            />
        </div>
    )
}
