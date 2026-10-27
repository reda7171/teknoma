'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Save, Send, Users, Mail, AlertTriangle, CheckCircle2, Settings, List } from 'lucide-react'
import { toast } from 'sonner'
import 'react-quill-new/dist/quill.snow.css'
import EmailTemplatesTab from '@/components/admin/EmailTemplatesTab'
import { getEmailTemplates } from '@/lib/actions/email-templates'

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

export default function MailingPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'send' | 'list' | 'templates'>('send')
    const [subject, setSubject] = useState('')
    const [htmlContent, setHtmlContent] = useState('')
    const [audience, setAudience] = useState('TEST_ONLY')
    const [targetedEmails, setTargetedEmails] = useState('')
    const [couponCode, setCouponCode] = useState('RIWAYA10')
    const [isHtmlMode, setIsHtmlMode] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [result, setResult] = useState<any>(null)

    // Data for the lists
    const [customers, setCustomers] = useState<any[]>([])
    const [subscribers, setSubscribers] = useState<any[]>([])
    const [isLoadingList, setIsLoadingList] = useState(false)

    // Templates
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState('')

    useEffect(() => {
        if (activeTab === 'send' && templates.length === 0) {
            fetchTemplates()
        }
        if ((activeTab === 'list' || audience === 'TARGETED_CLIENTS') && customers.length === 0 && subscribers.length === 0 && !isLoadingList) {
            fetchLists()
        }
    }, [activeTab, audience])

    const fetchTemplates = async () => {
        try {
            const res = await getEmailTemplates()
            if (res.success && res.data) {
                setTemplates(res.data)
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des templates", error)
        }
    }

    const fetchLists = async () => {
        setIsLoadingList(true)
        try {
            const res = await fetch('/api/admin/mailing/list')
            const data = await res.json()
            if (res.ok) {
                setCustomers(data.customers || [])
                setSubscribers(data.subscribers || [])
            } else {
                toast.error(data.error || 'Erreur de chargement')
            }
        } catch (error) {
            toast.error('Erreur réseau')
        } finally {
            setIsLoadingList(false)
        }
    }

    const handleSend = async () => {
        if (!subject || !htmlContent) {
            toast.error('Veuillez remplir l\'objet et le contenu du mail.')
            return
        }
        
        if (audience === 'TARGETED_CLIENTS' && !targetedEmails.trim()) {
            toast.error('Veuillez saisir au moins une adresse e-mail.')
            return
        }

        if (audience === 'ALL_CUSTOMERS') {
            const confirm = window.confirm("Êtes-vous sûr de vouloir envoyer cet e-mail à TOUS les clients ayant une adresse e-mail ?")
            if (!confirm) return
        }

        setIsSending(true)
        setResult(null)
        try {
            const res = await fetch('/api/admin/mailing/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    html: htmlContent,
                    audience,
                    targetedEmails: audience === 'TARGETED_CLIENTS' ? targetedEmails : undefined,
                    couponCode: couponCode.trim() || 'RIWAYA10'
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi')

            toast.success(data.message)
            setResult(data)
            
        } catch (error: any) {
            toast.error(error.message || 'Une erreur est survenue')
        } finally {
            setIsSending(false)
        }
    }

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        setSelectedTemplateId(id)
        if (id) {
            const template = templates.find(t => t.id === id)
            if (template) {
                setSubject(template.subject || '')
                setHtmlContent(template.body || '')
                if (template.body?.includes('style="')) {
                    setIsHtmlMode(true)
                }
            }
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-pixio-yellow" />
                        Mailing & Newsletters
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gérez vos listes et envoyez des e-mails à vos clients.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === 'send' 
                        ? 'border-pixio-yellow text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Send className="h-4 w-4" />
                    Envoyer un E-mail
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === 'list' 
                        ? 'border-pixio-yellow text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <List className="h-4 w-4" />
                    Liste des abonnés
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === 'templates' 
                        ? 'border-pixio-yellow text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Mail className="h-4 w-4" />
                    Templates d'Emails
                </button>
            </div>

            {activeTab === 'send' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Éditeur */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 space-y-4">
                            {/* Choix de Template */}
                            {templates.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Charger un template prédéfini (optionnel)
                                    </label>
                                    <select 
                                        value={selectedTemplateId}
                                        onChange={handleTemplateChange}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pixio-yellow focus:border-pixio-yellow transition-colors"
                                    >
                                        <option value="">-- Nouveau message (vide) --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Objet de l'e-mail
                                </label>
                                <input 
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="ex: Découvrez nos nouveautés !"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pixio-yellow focus:border-pixio-yellow transition-colors"
                                />
                            </div>

                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Contenu de l'e-mail
                                </label>
                                <button 
                                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                                    className="text-xs font-medium text-pixio-yellow hover:underline"
                                >
                                    {isHtmlMode ? 'Passer à l\'éditeur visuel' : 'Passer à l\'éditeur de code HTML'}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="text-xs text-slate-600 font-bold">Balises disponibles :</span>
                                <button
                                    type="button"
                                    onClick={() => setHtmlContent(prev => prev + ' {{client_nom}}')}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg font-mono text-xs font-black shadow-sm transition-colors"
                                    title="Cliquer pour insérer {{client_nom}}"
                                >
                                    {"{{client_nom}}"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHtmlContent(prev => prev + ' {{coupon_code}}')}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg font-mono text-xs font-black shadow-sm transition-colors"
                                    title="Cliquer pour insérer {{coupon_code}}"
                                >
                                    {"{{coupon_code}}"}
                                </button>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                {isHtmlMode ? (
                                    <textarea 
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                        className="w-full h-64 p-4 font-mono text-sm bg-slate-900 text-slate-300 focus:outline-none"
                                        placeholder="<h1>Votre code HTML ici</h1>"
                                    />
                                ) : (
                                    <ReactQuill 
                                        theme="snow"
                                        value={htmlContent}
                                        onChange={setHtmlContent}
                                        className="h-64 mb-12"
                                        placeholder="Rédigez votre message ici..."
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'color': [] }, { 'background': [] }],
                                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                                ['link', 'image'],
                                                ['clean']
                                            ],
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Panneau de configuration */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 space-y-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
                                <Settings className="h-5 w-5 text-slate-400" />
                                Configuration
                            </h2>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Code Coupon (remplace {"{{coupon_code}}"})
                                </label>
                                <input 
                                    type="text" 
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="Ex: RIWAYA10"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pixio-yellow uppercase font-mono font-bold text-sm tracking-wider"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Remplacera automatiquement toute mention de <code className="text-black font-bold">{"{{coupon_code}}"}</code> dans le message.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Audience Cible
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="radio" 
                                            name="audience" 
                                            value="TEST_ONLY"
                                            checked={audience === 'TEST_ONLY'}
                                            onChange={(e) => setAudience(e.target.value)}
                                            className="mt-1 text-pixio-yellow focus:ring-pixio-yellow"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Test uniquement</p>
                                            <p className="text-xs text-slate-500">M'envoyer l'e-mail à moi-même pour vérifier.</p>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="radio" 
                                            name="audience" 
                                            value="ALL_CUSTOMERS"
                                            checked={audience === 'ALL_CUSTOMERS'}
                                            onChange={(e) => setAudience(e.target.value)}
                                            className="mt-1 text-pixio-yellow focus:ring-pixio-yellow"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Tous les clients</p>
                                            <p className="text-xs text-slate-500">Clients de la base ayant un e-mail.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="radio" 
                                            name="audience" 
                                            value="NEWSLETTER_SUBSCRIBERS"
                                            checked={audience === 'NEWSLETTER_SUBSCRIBERS'}
                                            onChange={(e) => setAudience(e.target.value)}
                                            className="mt-1 text-pixio-yellow focus:ring-pixio-yellow"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Inscrits Newsletter</p>
                                            <p className="text-xs text-slate-500">Personnes inscrites depuis le footer.</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="radio" 
                                            name="audience" 
                                            value="TARGETED_CLIENTS"
                                            checked={audience === 'TARGETED_CLIENTS'}
                                            onChange={(e) => setAudience(e.target.value)}
                                            className="mt-1 text-pixio-yellow focus:ring-pixio-yellow"
                                        />
                                        <div className="w-full">
                                            <p className="font-medium text-slate-800">Clients ciblés</p>
                                            <p className="text-xs text-slate-500 mb-2">Entrez des adresses e-mails manuellement.</p>
                                            
                                            {audience === 'TARGETED_CLIENTS' && (
                                                <div className="mt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                    <textarea 
                                                        value={targetedEmails}
                                                        onChange={(e) => setTargetedEmails(e.target.value)}
                                                        placeholder="email1@test.com, email2@test.com..."
                                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pixio-yellow focus:border-pixio-yellow transition-colors"
                                                        rows={2}
                                                    />
                                                    
                                                    <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                                                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
                                                            Ou sélectionner parmi la base :
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto p-2 space-y-1 bg-white">
                                                            {isLoadingList ? (
                                                                <p className="text-xs text-slate-500 text-center py-4">Chargement des contacts...</p>
                                                            ) : (
                                                                <>
                                                                    {[...customers, ...subscribers].filter(u => u.email).map((user, idx) => {
                                                                        const isSelected = targetedEmails.includes(user.email)
                                                                        return (
                                                                            <label key={idx} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                                                                <input 
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={(e) => {
                                                                                        let currentEmails = targetedEmails.split(',').map(e => e.trim()).filter(e => e)
                                                                                        if (e.target.checked) {
                                                                                            if (!currentEmails.includes(user.email)) currentEmails.push(user.email)
                                                                                        } else {
                                                                                            currentEmails = currentEmails.filter(e => e !== user.email)
                                                                                        }
                                                                                        setTargetedEmails(currentEmails.join(', '))
                                                                                    }}
                                                                                    className="text-pixio-yellow focus:ring-pixio-yellow rounded border-slate-300"
                                                                                />
                                                                                <span className="text-sm text-slate-700 truncate w-full">
                                                                                    {user.fullName ? `${user.fullName} (${user.email})` : user.email}
                                                                                </span>
                                                                            </label>
                                                                        )
                                                                    })}
                                                                    {[...customers, ...subscribers].length === 0 && (
                                                                        <p className="text-xs text-slate-500 text-center py-4">Aucun contact trouvé.</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white transition-all ${
                                    isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                                }`}
                            >
                                {isSending ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                                {isSending ? 'Envoi en cours...' : 'Envoyer l\'e-mail'}
                            </button>

                            {result && (
                                <div className="mt-4 bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 text-sm">
                                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Rapport d'envoi
                                    </h4>
                                    <ul className="space-y-1">
                                        <li>Total ciblé : {result.stats.total}</li>
                                        <li>Succès : {result.stats.success}</li>
                                        <li>Échecs : {result.stats.failed}</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users className="h-5 w-5 text-slate-400" />
                                Clients Inscrits ({customers.length})
                            </h2>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[600px]">
                            {isLoadingList ? (
                                <p className="p-8 text-center text-slate-500">Chargement...</p>
                            ) : customers.length === 0 ? (
                                <p className="p-8 text-center text-slate-500">Aucun client avec e-mail.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {customers.map((c) => (
                                        <li key={c.id} className="p-4 hover:bg-slate-50">
                                            <p className="font-medium text-slate-900">{c.email}</p>
                                            <p className="text-sm text-slate-500">{c.fullName || 'Sans nom'} • {c.phone || 'Sans tel'}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Mail className="h-5 w-5 text-slate-400" />
                                Abonnés Newsletter ({subscribers.length})
                            </h2>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[600px]">
                            {isLoadingList ? (
                                <p className="p-8 text-center text-slate-500">Chargement...</p>
                            ) : subscribers.length === 0 ? (
                                <p className="p-8 text-center text-slate-500">Aucun abonné newsletter.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {subscribers.map((s) => (
                                        <li key={s.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                            <p className="font-medium text-slate-900">{s.email}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(s.createdAt).toLocaleDateString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <EmailTemplatesTab />
                </div>
            )}
        </div>
    )
}
