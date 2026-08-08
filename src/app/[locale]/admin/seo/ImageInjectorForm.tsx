'use client'

import { useState } from 'react'
import { updateSetting } from '@/lib/actions/site-settings'
import { Save, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ImageInjectorForm({ initialInjectedTags }: { initialInjectedTags: string }) {
    const [injectedTags, setInjectedTags] = useState(initialInjectedTags)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            await updateSetting('seo_injected_head_tags', injectedTags, 'seo', 'Balises Head Injectées (Analytics, Verification, etc.)')
            setMessage('Balises enregistrées avec succès !')
            router.refresh()
        } catch (error) {
            setMessage('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                    Outil d'injection de balises SEO avancées (meta image, robots, Google Search Console, Open Graph...).
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <label htmlFor="injectedTags" className="block text-sm font-black text-gray-900 uppercase tracking-widest">
                        Balises personnalisées dans le &lt;head&gt;
                    </label>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">HTML / Meta</span>
                </div>
                <textarea
                    id="injectedTags"
                    value={injectedTags}
                    rows={20}
                    onChange={(e) => setInjectedTags(e.target.value)}
                    className="w-full px-5 py-4 font-mono text-sm leading-relaxed rounded-xl border border-gray-800 bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                    placeholder={`<!-- Exemple de balises à injecter -->\n<meta name="google-site-verification" content="..." />\n<meta property="og:image" content="https://..." />\n<script src="..."></script>`}
                />
                <div className="mt-3 flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <span className="text-orange-500 font-black">!</span>
                    <p className="text-xs text-orange-800 font-medium leading-relaxed">
                        Attention : Ces balises seront injectées <strong>telles quelles</strong> dans le <code>&lt;head&gt;</code> de <strong>toutes</strong> les pages du site. 
                        Une erreur de syntaxe HTML ici pourrait "casser" l'affichage ou le SEO du site.
                    </p>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
        </form>
    )
}
