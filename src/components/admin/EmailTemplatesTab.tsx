'use client'

import { useState, useEffect } from 'react'
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/actions/email-templates'
import { Plus, Edit2, Trash2, Mail, Save, X, Loader2, Info } from 'lucide-react'

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
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        setLoading(true)
        const res = await getEmailTemplates()
        if (res.success && res.data) {
            setTemplates(res.data)
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
            alert(res.error || 'Erreur lors de la suppression')
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
            fetchTemplates()
        } else {
            setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'enregistrement' })
        }
        setIsSaving(false)
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
    }

    return (
        <div className="space-y-6">
            {!isEditing ? (
                <>
                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100">
                        <div>
                            <h2 className="text-xl font-black text-black">Templates d'Emails</h2>
                            <p className="text-sm text-gray-500">Gérez les modèles utilisés pour les notifications automatiques.</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau Template
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(template => (
                            <div key={template.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-black">{template.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-1">{template.subject}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-6 line-clamp-2 min-h-[40px]">
                                    {template.description || 'Aucune description'}
                                </p>
                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {templates.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                Aucun template trouvé. Créez-en un nouveau !
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                        <h2 className="text-xl font-black text-black">
                            {currentTemplate.id ? 'Modifier le Template' : 'Nouveau Template'}
                        </h2>
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
                                    placeholder="ex: CODE_PROMO_BIENVENUE"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sujet de l'email</label>
                                <input
                                    type="text"
                                    value={currentTemplate.subject || ''}
                                    onChange={e => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                                    placeholder="ex: Votre code promo exclusif ! 🎉"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium"
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
                                placeholder="À quoi sert ce template ?"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contenu (HTML autorisé)</label>
                                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                    Variables disponibles: <code className="text-black font-bold">{"{{client_nom}}"}</code>, <code className="text-black font-bold">{"{{coupon_code}}"}</code>, <code className="text-black font-bold">{"{{numero_commande}}"}</code>
                                </span>
                            </div>
                            <textarea
                                value={currentTemplate.body || ''}
                                onChange={e => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                                rows={15}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none font-mono text-sm leading-relaxed"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="font-medium text-sm">{message.text}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
