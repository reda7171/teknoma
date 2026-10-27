'use client'

import { useState, useEffect } from 'react'
import { 
    getEmailTemplates, 
    createEmailTemplate, 
    updateEmailTemplate, 
    deleteEmailTemplate,
    getAutomatedEmailRules,
    saveAutomatedEmailRules,
    sendTestEmailTemplate,
    type AutomatedEmailRule
} from '@/lib/actions/email-templates'
import { Plus, Edit2, Trash2, Mail, Save, X, Loader2, Info, Send, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

type EmailTemplate = {
    id: string
    name: string
    subject: string
    body: string
    description: string | null
    isHtml: boolean
}

export default function EmailTemplatesTab() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [rules, setRules] = useState<AutomatedEmailRule[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [savingRules, setSavingRules] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [ruleMessage, setRuleMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Modal de test d'envoi
    const [testModal, setTestModal] = useState<{ open: boolean; templateId: string; templateName: string }>({
        open: false,
        templateId: '',
        templateName: ''
    })
    const [testEmail, setTestEmail] = useState('')
    const [sendingTest, setSendingTest] = useState(false)
    const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [templatesRes, rulesRes] = await Promise.all([
            getEmailTemplates(),
            getAutomatedEmailRules()
        ])

        if (templatesRes.success && templatesRes.data) {
            setTemplates(templatesRes.data)
        }
        if (rulesRes) {
            setRules(rulesRes)
        }
        setLoading(false)
    }

    const handleCreateNew = () => {
        setCurrentTemplate({
            name: '',
            subject: '',
            body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px;">
    <img src="https://riwaya.store/logo.png" alt="Riwaya Logo" style="max-height: 60px;" />
  </div>
  
  <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
    <h2>Bonjour {{client_nom}},</h2>
    <p>Merci pour votre confiance ! Voici votre code coupon :</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <span style="background-color: #000; color: #fff; padding: 10px 20px; font-size: 20px; font-weight: bold; border-radius: 4px; letter-spacing: 2px;">
        {{coupon_code}}
      </span>
    </div>
    
    <p>Ce code est valable sur tout notre catalogue.</p>
  </div>
  
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #eee;">
    <p><strong>L'équipe Riwaya</strong></p>
    <p>Livraison partout au Maroc 🚚</p>
    <p>Paiement à la livraison 💵</p>
    <p><a href="https://riwaya.store" style="color: #666;">www.riwaya.store</a></p>
  </div>
</div>`,
            description: ''
        })
        setIsEditing(true)
        setMessage(null)
    }

    const handleEdit = (template: EmailTemplate) => {
        setCurrentTemplate(template)
        setIsEditing(true)
        setMessage(null)
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce template ?')) return
        const res = await deleteEmailTemplate(id)
        if (res.success) {
            setTemplates(prev => prev.filter(t => t.id !== id))
        } else {
            setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression' })
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentTemplate.name || !currentTemplate.subject || !currentTemplate.body) {
            setMessage({ type: 'error', text: 'Veuillez remplir les champs obligatoires' })
            return
        }

        setIsSaving(true)
        setMessage(null)

        let res
        if (currentTemplate.id) {
            res = await updateEmailTemplate(currentTemplate.id, {
                name: currentTemplate.name,
                subject: currentTemplate.subject,
                body: currentTemplate.body,
                description: currentTemplate.description || undefined
            })
        } else {
            res = await createEmailTemplate({
                name: currentTemplate.name,
                subject: currentTemplate.subject,
                body: currentTemplate.body,
                description: currentTemplate.description || undefined
            })
        }

        if (res.success) {
            setMessage({ type: 'success', text: 'Template enregistré avec succès' })
            setIsEditing(false)
            loadData()
        } else {
            setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'enregistrement' })
        }
        setIsSaving(false)
    }

    const handleToggleRule = (key: string) => {
        setRules(prev => prev.map(r => r.key === key ? { ...r, active: !r.active } : r))
    }

    const handleSelectRuleTemplate = (key: string, templateId: string) => {
        setRules(prev => prev.map(r => r.key === key ? { ...r, templateId } : r))
    }

    const handleSaveRules = async () => {
        setSavingRules(true)
        setRuleMessage(null)
        const payload = rules.map(r => ({
            key: r.key,
            templateId: r.templateId,
            active: r.active
        }))
        const res = await saveAutomatedEmailRules(payload)
        if (res.success) {
            setRuleMessage({ type: 'success', text: 'Règles d\'automatisation mises à jour avec succès.' })
            setTimeout(() => setRuleMessage(null), 4000)
        } else {
            setRuleMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde' })
        }
        setSavingRules(false)
    }

    const openTestModal = (templateId: string, templateName: string) => {
        setTestModal({ open: true, templateId, templateName })
        setTestStatus(null)
    }

    const handleSendTest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!testEmail || !testEmail.includes('@')) {
            setTestStatus({ type: 'error', text: 'Veuillez saisir une adresse email valide' })
            return
        }

        setSendingTest(true)
        setTestStatus(null)

        const res = await sendTestEmailTemplate(testModal.templateId, testEmail)
        if (res.success) {
            setTestStatus({ type: 'success', text: `Email de test envoyé avec succès à ${testEmail}` })
        } else {
            setTestStatus({ type: 'error', text: res.error || 'Erreur d\'envoi SMTP' })
        }
        setSendingTest(false)
    }

    // Trouver les triggers associés à chaque template pour l'affichage de badges
    const getLinkedTriggers = (template: EmailTemplate) => {
        return rules.filter(r => r.active && (r.templateId === template.id || r.templateId === template.name))
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
    }

    return (
        <div className="space-y-8">
            {!isEditing ? (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div>
                            <h2 className="text-xl font-black text-black tracking-tight">Templates & Envois Automatiques</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Gérez les modèles de message et associez-les aux événements de vente.</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau Template
                        </button>
                    </div>

                    {/* Automatisation des déclencheurs */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                    <Zap className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-black text-base">Déclencheurs Automatiques (Triggers)</h3>
                                    <p className="text-xs text-gray-500">Choisissez quel template envoyer lors de chaque événement boutique.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSaveRules}
                                disabled={savingRules}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                                {savingRules ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Enregistrer les automatisations
                            </button>
                        </div>

                        {ruleMessage && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${ruleMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                                {ruleMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                                <span className="font-medium">{ruleMessage.text}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            {rules.map((rule) => {
                                const selectedTemplate = templates.find(t => t.id === rule.templateId || t.name === rule.templateId)
                                return (
                                    <div
                                        key={rule.key}
                                        className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${rule.active ? 'bg-gray-50/50 border-gray-200' : 'bg-white border-dashed border-gray-200 opacity-60'}`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-[280px]">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleRule(rule.key)}
                                                className={`relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rule.active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                                                role="switch"
                                                aria-checked={rule.active}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rule.active ? 'translate-x-5' : 'translate-x-0'}`}
                                                />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-black">{rule.label}</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                                        {rule.active ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full lg:w-auto">
                                            <div className="flex-1 lg:w-72">
                                                <select
                                                    value={rule.templateId}
                                                    onChange={(e) => handleSelectRuleTemplate(rule.key, e.target.value)}
                                                    disabled={!rule.active}
                                                    aria-label={rule.label}
                                                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 disabled:bg-gray-100 disabled:text-gray-400"
                                                >
                                                    <option value="">Sélectionner un template...</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.name} — {t.subject.slice(0, 30)}...
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => openTestModal(selectedTemplate.id, selectedTemplate.name)}
                                                    title="Envoyer un email de test"
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-black text-gray-700 hover:text-black rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>Tester</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Catalogue des templates existants */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-base font-black text-black">Modèles Enregistrés ({templates.length})</h3>
                            <p className="text-xs text-gray-500">Personnalisez le contenu HTML et les variables dynamiques.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(template => {
                                const linked = getLinkedTriggers(template)
                                return (
                                    <div key={template.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <Mail className="w-5 h-5 text-gray-700" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-black text-sm">{template.name}</h4>
                                                        <p className="text-xs text-gray-500 line-clamp-1">{template.subject}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {linked.length > 0 && (
                                                <div className="mb-3 flex flex-wrap gap-1">
                                                    {linked.map(l => (
                                                        <span key={l.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                                            <Zap className="w-2.5 h-2.5" /> {l.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-600 line-clamp-2 min-h-[36px]">
                                                {template.description || 'Aucune description spécifique renseignée.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
                                            <button
                                                type="button"
                                                onClick={() => openTestModal(template.id, template.name)}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-black py-1 px-2 hover:bg-gray-100 rounded-md transition-colors"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Tester
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(template)}
                                                    title="Modifier"
                                                    className="p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    title="Supprimer"
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {templates.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-500">
                                    Aucun template trouvé. Créez-en un nouveau ou exécutez le script d'initialisation.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* Mode Edition de Template */
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-black text-black">
                                {currentTemplate.id ? 'Modifier le Template' : 'Nouveau Template'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">Configurez le sujet, la structure HTML et les balises de remplacement.</p>
                        </div>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identifiant (Nom unique)</label>
                                <input
                                    type="text"
                                    value={currentTemplate.name || ''}
                                    onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                    placeholder="ex: CONFIRMATION_COMMANDE"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sujet de l'email</label>
                                <input
                                    type="text"
                                    value={currentTemplate.subject || ''}
                                    onChange={e => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                                    placeholder="ex: Confirmation de votre commande Riwaya #{{order_id}}"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description (Optionnelle)</label>
                            <input
                                type="text"
                                value={currentTemplate.description || ''}
                                onChange={e => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                                placeholder="À quel moment ce message doit être déclenché ?"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contenu (HTML)</label>
                                <span className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-150">
                                    Balises : <code className="text-black font-bold">{"{{client_nom}}"}</code>, <code className="text-black font-bold">{"{{coupon_code}}"}</code>, <code className="text-black font-bold">{"{{order_id}}"}</code>, <code className="text-black font-bold">{"{{total}}"}</code>, <code className="text-black font-bold">{"{{articles}}"}</code>, <code className="text-black font-bold">{"{{tracking_url}}"}</code>
                                </span>
                            </div>
                            <textarea
                                value={currentTemplate.body || ''}
                                onChange={e => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                                rows={16}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-mono text-xs leading-relaxed"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="font-medium text-sm">{message.text}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2.5 border border-gray-200 hover:border-black rounded-xl font-bold text-sm text-gray-700 hover:text-black transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Test d'envoi SMTP */}
            {testModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Send className="w-4 h-4 text-black" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-black">Tester l'envoi du template</h3>
                                    <p className="text-[11px] text-gray-500">{testModal.templateName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTestModal({ open: false, templateId: '', templateName: '' })}
                                className="p-1.5 text-gray-400 hover:text-black rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSendTest} className="mt-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600">Email destinataire pour le test</label>
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="admin@riwaya.com ou client@gmail.com"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5"
                                    required
                                    autoFocus
                                />
                                <p className="text-[11px] text-gray-400">
                                    Les balises (nom client, n° commande, total) seront injectées avec des valeurs d'exemple réalistes.
                                </p>
                            </div>

                            {testStatus && (
                                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${testStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                                    {testStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                                    <span>{testStatus.text}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setTestModal({ open: false, templateId: '', templateName: '' })}
                                    className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600 hover:text-black"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingTest}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Envoyer le test
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

