'use client'

import { useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Check, X, Upload, Image as ImageIcon, Search, Phone, Eye, EyeOff } from 'lucide-react'
import { createShippingCompany, updateShippingCompany, deleteShippingCompany, setDefaultShippingCompany } from '@/lib/actions/shipping-companies'

const EMPTY_FORM = { name: '', logo: '', apiKey: '', apiToken: '', apiUrl: '', supportPhone: '', isActive: true }

export default function ShippingCompaniesClient({ initialCompanies, initialDefaultId }: { initialCompanies: any[], initialDefaultId: string | null }) {
    const [companies, setCompanies] = useState(initialCompanies)
    const [defaultCompanyId, setDefaultCompanyId] = useState(initialDefaultId)
    const [isSettingDefault, setIsSettingDefault] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [currentCompany, setCurrentCompany] = useState<any>(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [logoPreview, setLogoPreview] = useState<string>('')
    const [uploading, setUploading] = useState(false)
    const [showApiKey, setShowApiKey] = useState(false)
    const [showApiToken, setShowApiToken] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleEdit = (comp: any) => {
        setCurrentCompany(comp)
        setFormData({ name: comp.name, logo: comp.logo || '', apiKey: comp.apiKey || '', apiToken: comp.apiToken || '', apiUrl: comp.apiUrl || '', supportPhone: comp.supportPhone || '', isActive: comp.isActive })
        setLogoPreview(comp.logo || '')
        setIsEditing(true)
    }

    const handleAdd = () => {
        setCurrentCompany(null)
        setFormData(EMPTY_FORM)
        setLogoPreview('')
        setIsEditing(true)
    }

    const handleCancel = () => { setIsEditing(false); setCurrentCompany(null) }

    // Upload logo vers /api/upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                const url = data.url || data.path || ''
                setFormData(prev => ({ ...prev, logo: url }))
                setLogoPreview(url)
            }
        } catch (err) {
            console.error('Erreur upload logo', err)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (currentCompany) {
            const res = await updateShippingCompany(currentCompany.id, formData)
            if (res.success) {
                setCompanies(companies.map(c => c.id === currentCompany.id ? { ...c, ...formData } : c))
                setIsEditing(false)
            } else alert(res.error)
        } else {
            const res = await createShippingCompany(formData)
            if (res.success) window.location.reload()
            else alert(res.error)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Voulez-vous vraiment supprimer cette société ?')) {
            const res = await deleteShippingCompany(id)
            if (res.success) setCompanies(companies.filter(c => c.id !== id))
            else alert(res.error)
        }
    }

    const toggleStatus = async (comp: any) => {
        const res = await updateShippingCompany(comp.id, { isActive: !comp.isActive })
        if (res.success) setCompanies(companies.map(c => c.id === comp.id ? { ...c, isActive: !comp.isActive } : c))
    }

    const handleSetDefault = async (id: string) => {
        if (!confirm('Définir cette société comme celle par défaut ?')) return
        setIsSettingDefault(true)
        const res = await setDefaultShippingCompany(id)
        if (res.success) {
            setDefaultCompanyId(id)
        } else {
            alert(res.error)
        }
        setIsSettingDefault(false)
    }


    if (isEditing) {
        return (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
                <h2 className="text-xl font-black uppercase mb-6">{currentCompany ? 'Modifier la société' : 'Nouvelle société'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Logo */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Logo</label>
                        <div className="flex items-center gap-5">
                            {/* Prévisualisation */}
                            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                                {/* URL manuelle */}
                                <input
                                    type="text"
                                    value={formData.logo}
                                    onChange={e => { setFormData({ ...formData, logo: e.target.value }); setLogoPreview(e.target.value) }}
                                    placeholder="URL du logo (https://...)"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 outline-none text-sm"
                                />
                                {/* Ou upload fichier */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 w-fit"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    {uploading ? 'Upload...' : 'Téléverser un fichier'}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </div>
                        </div>
                    </div>

                    {/* Nom */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Nom *</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none" />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                            API Intégration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">URL de l'API</label>
                                <input type="url" value={formData.apiUrl} onChange={e => setFormData({ ...formData, apiUrl: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none placeholder-gray-300" placeholder="Ex: https://..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Clé API</label>
                                <div className="relative">
                                    <input 
                                        type={showApiKey ? "text" : "password"} 
                                        value={formData.apiKey} 
                                        onChange={e => setFormData({ ...formData, apiKey: e.target.value })} 
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none placeholder-gray-300" 
                                        placeholder="••••••••••••••••" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Token API</label>
                                <div className="relative">
                                    <input
                                        type={showApiToken ? 'text' : 'password'}
                                        value={formData.apiToken}
                                        onChange={e => setFormData({ ...formData, apiToken: e.target.value })}
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none placeholder-gray-300"
                                        placeholder="••••••••••••••••"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiToken(!showApiToken)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                                        aria-label={showApiToken ? 'Masquer le token API' : 'Afficher le token API'}
                                    >
                                        {showApiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Numéro Support</label>
                        <input type="text" value={formData.supportPhone} onChange={e => setFormData({ ...formData, supportPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 outline-none" placeholder="+212..." />
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl">
                        <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 accent-black" />
                        <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Société active</label>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="submit" className="px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">Enregistrer</button>
                        <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-100 text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Annuler</button>
                    </div>
                </form>
            </div>
        )
    }

    const filteredCompanies = companies.filter(comp => 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.apiUrl && comp.apiUrl.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.supportPhone && comp.supportPhone.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black uppercase">Liste des sociétés</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher une société..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                        />
                    </div>
                    <button onClick={handleAdd} className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Ajouter
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-gray-100 p-8">
                        Aucune société trouvée.
                    </div>
                ) : (
                    filteredCompanies.map(comp => (
                        <div key={comp.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative hover:shadow-md transition-shadow">
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => handleEdit(comp)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(comp.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>

                            {/* Logo + Nom */}
                            <div className="flex items-center gap-4 mb-4 pr-20">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {comp.logo ? (
                                        <img src={comp.logo} alt={comp.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="text-xl font-black text-gray-300">{comp.name[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black">{comp.name}</h3>
                                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{comp.apiUrl || 'Pas d\'URL API'}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-5">
                                <p className="text-xs text-gray-600"><span className="font-bold">Chiffre d'Affaire:</span> <span className="text-green-600 font-black">{comp.revenue ? comp.revenue.toFixed(2) : '0.00'} درهم</span></p>
                                <p className="text-xs text-gray-600"><span className="font-bold">API Key:</span> {comp.apiKey ? '••••••••' : <span className="text-gray-300">Non défini</span>}</p>
                                <p className="text-xs text-gray-600"><span className="font-bold">API Token:</span> {comp.apiToken ? '••••••••' : <span className="text-gray-300">Non défini</span>}</p>
                                <p className="text-xs text-gray-600"><span className="font-bold">Support:</span> {comp.supportPhone || <span className="text-gray-300">Non défini</span>}</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => toggleStatus(comp)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-colors ${comp.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {comp.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                    {comp.isActive ? 'Active' : 'Désactivée'}
                                </button>
                                {comp.supportPhone && (
                                    <a href={`tel:${comp.supportPhone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
                                        <Phone className="w-3.5 h-3.5" /> Support
                                    </a>
                                )}
                            </div>
                            
                            <div className="mt-2">
                                <button 
                                    onClick={() => handleSetDefault(comp.id)}
                                    disabled={isSettingDefault || defaultCompanyId === comp.id}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-colors border ${defaultCompanyId === comp.id ? 'bg-yellow-50 text-yellow-700 border-yellow-200 cursor-default' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {defaultCompanyId === comp.id ? (
                                        <><Check className="w-3.5 h-3.5" /> Par défaut</>
                                    ) : (
                                        'Définir par défaut'
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
