'use client'

import { useState } from 'react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import { Bell, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeliveryConfigForm({ 
    initialAnnouncementEnabled,
    initialAnnouncementMessage,
    initialAnnouncementBgColor,
    initialAnnouncementTextColor
}: { 
    initialAnnouncementEnabled: boolean,
    initialAnnouncementMessage: string,
    initialAnnouncementBgColor: string,
    initialAnnouncementTextColor: string
}) {
    const [announcementEnabled, setAnnouncementEnabled] = useState(initialAnnouncementEnabled)
    const [announcementMessage, setAnnouncementMessage] = useState(initialAnnouncementMessage)
    const [announcementBgColor, setAnnouncementBgColor] = useState(initialAnnouncementBgColor)
    const [announcementTextColor, setAnnouncementTextColor] = useState(initialAnnouncementTextColor)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            await updateMultipleSettings([
                { key: 'announcement_bar_enabled', value: announcementEnabled ? 'true' : 'false', category: 'marketing', description: 'Activer la bande d\'annonce sur les produits' },
                { key: 'announcement_bar_message', value: announcementMessage, category: 'marketing', description: 'Message de la bande d\'annonce' },
                { key: 'announcement_bar_bg_color', value: announcementBgColor, category: 'marketing', description: 'Couleur de fond de la bande d\'annonce' },
                { key: 'announcement_bar_text_color', value: announcementTextColor, category: 'marketing', description: 'Couleur du texte de la bande d\'annonce' }
            ])
            setMessage('Configuration enregistrée avec succès !')
            router.refresh()
        } catch (error) {
            setMessage('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}



            <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 pb-2 border-b border-gray-100 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Marketing & Annonces
                </h3>
                
                <div className="flex flex-col lg:flex-row items-end gap-6">
                    {/* Toggle */}
                    <div className="w-full lg:w-48 flex-shrink-0">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                            État
                        </label>
                        <div className="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 rounded-xl h-[52px] border border-gray-100">
                            <span className="text-xs font-black uppercase tracking-widest text-black">
                                Active
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={announcementEnabled}
                                    onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                            </label>
                        </div>
                    </div>

                    {/* Texte */}
                    <div className="flex-1 w-full">
                        <label htmlFor="announcementMessage" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                            Texte de l'annonce
                        </label>
                        <input
                            type="text"
                            id="announcementMessage"
                            value={announcementMessage}
                            onChange={(e) => setAnnouncementMessage(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all font-medium h-[52px]"
                            placeholder="Ex: Livraison Gratuite dès 500 MAD !"
                        />
                    </div>

                    {/* Couleurs */}
                    <div className="flex gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:w-32">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Fond
                            </label>
                            <div className="relative">
                                <input
                                    type="color"
                                    value={announcementBgColor}
                                    onChange={(e) => setAnnouncementBgColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div 
                                    className="w-full h-[52px] rounded-xl border border-gray-200 shadow-sm flex items-center justify-center font-mono text-xs font-bold uppercase transition-transform hover:scale-105"
                                    style={{ backgroundColor: announcementBgColor, color: announcementTextColor }}
                                >
                                    {announcementBgColor}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 lg:w-32">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Texte
                            </label>
                            <div className="relative">
                                <input
                                    type="color"
                                    value={announcementTextColor}
                                    onChange={(e) => setAnnouncementTextColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div 
                                    className="w-full h-[52px] rounded-xl border border-gray-200 shadow-sm flex items-center justify-center font-mono text-xs font-bold uppercase transition-transform hover:scale-105"
                                    style={{ backgroundColor: announcementTextColor, color: announcementBgColor }}
                                >
                                    {announcementTextColor}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full px-10 py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-black/10 disabled:opacity-50"
            >
                {loading ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
        </form>
    )
}

