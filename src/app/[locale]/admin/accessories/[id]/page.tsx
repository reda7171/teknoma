'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Save, Trash2, Package, Image as ImageIcon, Upload, Link2, Loader2, Video, Play, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { publishAccessoriesToJumia, checkJumiaLinkBySkuExact } from '@/lib/actions/jumia'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function EditAccessoryPage({ 
    params 
}: { 
    params: Promise<{ locale: string, id: string }> 
}) {
    const { locale, id } = use(params)
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload')
    const [isUploading, setIsUploading] = useState(false)
    const [isPushingJumia, setIsPushingJumia] = useState(false)
    const [isLinked, setIsLinked] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        costPrice: '',
        stock: '0',
        images: [] as string[],
        category: 'BOOKMARK',
        materials: '',
        dimensions: '',
        weight: '',
        warranty: '',
        sellerSku: '',
        active: true,
        jumiaHighlights: '',
        jumiaPackageContent: '',
        jumiaProductSid: '',
        isSyncedWithJumia: false,
        jumiaPriceMarkup: '0',
        jumiaStock: ''
    })
    const [videos, setVideos] = useState<string[]>([])
    const [isUploadingVideo, setIsUploadingVideo] = useState(false)
    const videoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetch(`/api/admin/accessories/${id}`)
            .then(res => res.json())
            .then(data => {
                setFormData({
                    name: data.name,
                    description: data.description || '',
                    price: data.price.toString(),
                    costPrice: data.costPrice.toString(),
                    stock: data.stock.toString(),
                    images: data.images || (data.image ? [data.image] : []),
                    category: data.category,
                    materials: data.materials || '',
                    dimensions: data.dimensions || '',
                    weight: data.weight || '',
                    warranty: data.warranty || '',
                    sellerSku: data.sellerSku || '',
                    active: data.active,
                    jumiaHighlights: data.jumiaHighlights || '',
                    jumiaPackageContent: data.jumiaPackageContent || '',
                    jumiaProductSid: data.jumiaProductSid || '',
                    isSyncedWithJumia: data.isSyncedWithJumia || false,
                    jumiaPriceMarkup: data.jumiaPriceMarkup?.toString() || '0',
                    jumiaStock: data.jumiaStock?.toString() || ''
                })
                // Charger les videos si elles existent
                if (data.videos && Array.isArray(data.videos)) {
                    setVideos(data.videos)
                }
                
                if (data.sellerSku) {
                    checkJumiaLinkBySkuExact(data.sellerSku, data.jumiaProductSid).then(linked => {
                        setIsLinked(linked)
                    }).catch(err => {
                        setIsLinked(false)
                    })
                }
                
                setIsLoading(false)
            })
            .catch(() => {
                alert('Erreur lors du chargement')
                router.push(`/${locale}/admin/accessories`)
            })
    }, [id, locale, router])

    /* Upload fichiers multiples vers /api/admin/upload */
    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return
        setIsUploading(true)
        try {
            const uploadedUrls: string[] = []
            for (let i = 0; i < files.length; i++) {
                const data = new FormData()
                data.append('file', files[i])
                const res = await fetch('/api/admin/upload', { method: 'POST', body: data })
                if (res.ok) {
                    const json = await res.json()
                    uploadedUrls.push(json.url)
                }
            }
            if (uploadedUrls.length > 0) {
                setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }))
            } else {
                alert('Erreur upload')
            }
        } finally {
            setIsUploading(false)
        }
    }

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const moveImage = (index: number, direction: 'left' | 'right') => {
        setFormData(prev => {
            const newImages = [...prev.images]
            if (direction === 'left' && index > 0) {
                [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
            } else if (direction === 'right' && index < newImages.length - 1) {
                [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]]
            }
            return { ...prev, images: newImages }
        })
    }

    async function handlePushToJumia() {
        if (!confirm('Voulez-vous vraiment publier cet accessoire sur Jumia ?')) return
        setIsPushingJumia(true)
        try {
            const res = await publishAccessoriesToJumia([id])
            if (res.success) {
                alert(res.message || 'Accessoire publié avec succès sur Jumia')
            } else {
                alert('Erreur: ' + res.message)
            }
        } catch (err) {
            alert('Erreur technique lors de la publication')
        } finally {
            setIsPushingJumia(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSaving(true)

        try {
            const res = await fetch(`/api/admin/accessories/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, videos })
            })

            if (res.ok) {
                router.push(`/${locale}/admin/accessories`)
                router.refresh()
            } else {
                const err = await res.json()
                alert(`Erreur: ${err.error}`)
            }
        } catch (err) {
            alert('Erreur technique')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="p-20 text-center font-bold text-slate-400">Chargement...</div>

    return (
        <div className="w-full mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/${locale}/admin/accessories`}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Modifier Produit</h1>
                            {formData.sellerSku && (
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1 ${isLinked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {isLinked ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Lié à Jumia
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-3 h-3" />
                                            Non Linké
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-sm font-medium text-slate-500">{formData.name}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {formData.images.length > 0 && (
                        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-center">
                            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-slate-200">
                                <Image src={formData.images[0]} alt="Produit" fill className="object-cover" unoptimized />
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nom du produit</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea
                                rows={4}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prix de vente (DH)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coût de revient (DH)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-3">Caractéristiques techniques (Optionnel)</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Matériaux / Matière</label>
                                <input
                                    type="text"
                                    value={formData.materials}
                                    onChange={e => setFormData({ ...formData, materials: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Ex: Cuir véritable / Métal"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dimensions</label>
                                <input
                                    type="text"
                                    value={formData.dimensions}
                                    onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Ex: 12 x 3 cm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Poids / Capacité</label>
                                <input
                                    type="text"
                                    value={formData.weight}
                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Ex: 64 Go / 150g"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Garantie</label>
                                <input
                                    type="text"
                                    value={formData.warranty}
                                    onChange={e => setFormData({ ...formData, warranty: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Ex: 1 an"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catégorie</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                            >
                                <option value="BOOKMARK">Marque-page</option>
                                <option value="LIBRARY">Bibliothèque</option>
                                <option value="USB">Clé USB</option>
                                <option value="FURNITURE">Fourniture bureau</option>
                                <option value="BOARD_GAME">Jeux de société</option>
                                <option value="KIDS">Produit enfant</option>
                                <option value="ACCESSORY">Accessoire</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock</label>
                            <input
                                type="number"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Statut</label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, active: !formData.active })}
                                className={`w-full py-3 rounded-xl text-sm font-bold border transition-all ${
                                    formData.active 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                            >
                                {formData.active ? 'Produit Actif' : 'Produit Inactif'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        {/* Image : onglets Upload / URL */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Images</label>

                            {/* Onglets */}
                            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setImageTab('upload')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all ${
                                        imageTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <Upload className="w-3.5 h-3.5" /> Uploader
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageTab('url')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all ${
                                        imageTab === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <Link2 className="w-3.5 h-3.5" /> URL
                                </button>
                            </div>

                            {imageTab === 'upload' ? (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all disabled:opacity-50"
                                    >
                                        <Upload className="w-6 h-6" />
                                        <span className="text-xs font-bold">
                                            {isUploading ? 'Upload en cours...' : 'Cliquer pour choisir des fichiers'}
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative group flex gap-2">
                                    <div className="relative flex-1">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            id="url-input"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('url-input') as HTMLInputElement
                                            if (input && input.value) {
                                                setFormData(prev => ({ ...prev, images: [...prev.images, input.value] }))
                                                input.value = ''
                                            }
                                        }}
                                        className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                                    >
                                        Ajouter
                                    </button>
                                </div>
                            )}

                            {/* Preview */}
                            {formData.images.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {formData.images.map((img, i) => (
                                        <div key={i} className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 group">
                                            <Image src={img} alt={`preview ${i}`} fill className="object-cover" unoptimized />
                                            
                                            {/* Reorder Controls */}
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 px-1 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => moveImage(i, 'left')}
                                                    disabled={i === 0}
                                                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <div className="w-[1px] h-3 bg-slate-300"></div>
                                                <button
                                                    type="button"
                                                    onClick={() => moveImage(i, 'right')}
                                                    disabled={i === formData.images.length - 1}
                                                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={handlePushToJumia}
                            disabled={isPushingJumia || isSaving}
                            className="w-1/3 flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-black text-sm rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 disabled:opacity-50"
                        >
                            {isPushingJumia ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : null}
                            Push to Jumia
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isPushingJumia}
                            className="flex-1 flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                        >
                            {isSaving ? 'Enregistrement...' : <><Save className="w-5 h-5 mr-3" /> Mettre à jour</>}
                        </button>
                    </div>

                    {/* Jumia Configuration */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                Configuration Jumia
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Synchronisé avec Jumia</label>
                                <select
                                    value={formData.isSyncedWithJumia ? 'true' : 'false'}
                                    onChange={e => setFormData({ ...formData, isSyncedWithJumia: e.target.value === 'true' })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                >
                                    <option value="false">❌ Non (Pas encore)</option>
                                    <option value="true">✅ Oui (Synchronisé)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seller SKU Jumia</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.sellerSku}
                                        onChange={e => setFormData({ ...formData, sellerSku: e.target.value })}
                                        className="flex-1 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                        placeholder="Ex: ACC-001"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, sellerSku: `RIW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` })}
                                        className="px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Générer
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product SID (Requis pour maj)</label>
                                <input
                                    type="text"
                                    value={formData.jumiaProductSid}
                                    onChange={e => setFormData({ ...formData, jumiaProductSid: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Ex: 5b4e1234-..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Virtuel Jumia (Optionnel)</label>
                                <input
                                    type="number"
                                    value={formData.jumiaStock}
                                    onChange={e => setFormData({ ...formData, jumiaStock: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="Laisser vide pour sync auto"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Marge Jumia (DH)</label>
                                <input
                                    type="number"
                                    value={formData.jumiaPriceMarkup}
                                    onChange={e => setFormData({ ...formData, jumiaPriceMarkup: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Package Content Jumia</label>
                                <input
                                    type="text"
                                    value={formData.jumiaPackageContent}
                                    onChange={e => setFormData({ ...formData, jumiaPackageContent: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder={`1 x Accessoire`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Highlights Jumia (HTML)</label>
                                <textarea
                                    value={formData.jumiaHighlights}
                                    onChange={e => setFormData({ ...formData, jumiaHighlights: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder={`<ul><li>Titre: Accessoire</li></ul>`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Section Videos UGC */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 mt-8">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                            <Video className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900">Vidéos UGC</h3>
                            <p className="text-[10px] text-slate-400 font-medium">User Generated Content — témoignages & démonstrations</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploadingVideo ? 'Upload...' : 'Ajouter une vidéo'}
                    </button>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                            const files = e.target.files
                            if (!files || files.length === 0) return
                            setIsUploadingVideo(true)
                            try {
                                const uploaded: string[] = []
                                for (let i = 0; i < files.length; i++) {
                                    const fd = new FormData()
                                    fd.append('file', files[i])
                                    const res = await fetch('/api/admin/upload-video', { method: 'POST', body: fd })
                                    if (res.ok) {
                                        const json = await res.json()
                                        uploaded.push(json.url)
                                    }
                                }
                                if (uploaded.length > 0) {
                                    const newVideos = [...videos, ...uploaded]
                                    setVideos(newVideos)
                                    // Sauvegarder automatiquement
                                    await fetch(`/api/admin/accessories/${id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...formData, videos: newVideos })
                                    })
                                }
                            } finally {
                                setIsUploadingVideo(false)
                                if (videoInputRef.current) videoInputRef.current.value = ''
                            }
                        }}
                    />
                </div>

                {videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                        <Play className="w-12 h-12 mb-3" />
                        <p className="text-sm font-bold">Aucune vidéo UGC pour cet article</p>
                        <p className="text-xs mt-1">MP4, WebM, MOV — Max 200MB</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos.map((url, i) => (
                            <div key={i} className="relative group rounded-2xl overflow-hidden bg-slate-900 aspect-video">
                                <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    controls
                                    preload="metadata"
                                />
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const newVideos = videos.filter((_, idx) => idx !== i)
                                        setVideos(newVideos)
                                        await fetch(`/api/admin/accessories/${id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ...formData, videos: newVideos })
                                        })
                                    }}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                    UGC #{i + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
