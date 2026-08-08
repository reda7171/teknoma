import { verifyAdmin } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { getAllSettings } from '@/lib/actions/site-settings'
import GeoConfigForm from './GeoConfigForm'

export const metadata = {
    title: 'Expert GEO | Admin Riwaya',
}

export default async function GeoConfigPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }

    const settings = await getAllSettings()

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
                        Expert GEO<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Generative Engine Optimization
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-12 overflow-hidden">
                <div className="w-full mx-auto">
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-black tracking-tight">Configuration <span className="text-emerald-600">GEO</span></h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Optimisation pour les IA génératives (ChatGPT, Gemini, etc.)</p>
                            </div>
                        </div>
                        
                        <GeoConfigForm initialData={settings} />
                    </div>
                </div>
            </div>
        </div>
    )
}
