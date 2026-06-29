'use client'

import { useState } from 'react'
import { Save, Loader2, FileText, CheckCircle2 } from 'lucide-react'
import { updateSetting } from '@/lib/actions/site-settings'
import { useRouter } from 'next/navigation'

export default function LlmsConfigForm({ initialContent }: { initialContent: string }) {
    const [content, setContent] = useState(initialContent)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        setSaved(false)
        try {
            const result = await updateSetting('llms_txt_content', content, 'seo', 'Fichier LLMs.txt')
            if (result.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
                router.refresh()
            } else {
                alert(result.error || "Erreur lors de la sauvegarde")
            }
        } catch (error) {
            console.error(error)
            alert("Erreur serveur")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Fichier LLMs.txt</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Ce contenu sera servi aux robots IA (ChatGPT, Claude, etc.) sur <span className="font-mono bg-gray-100 px-1 rounded">/llms.txt</span>. Utilisez du Markdown.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                            <CheckCircle2 className="w-4 h-4" /> Sauvegardé
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-3 bg-black text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl shadow-black/10 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Sauvegarder
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <FileText className="w-5 h-5" />
                    <span className="font-bold text-sm tracking-widest uppercase">Éditeur Markdown</span>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-mono text-gray-800 resize-y"
                    placeholder="Contenu Markdown de votre fichier llms.txt..."
                />
            </div>
        </div>
    )
}
