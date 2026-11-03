'use client'

import { useState } from 'react'
import { CheckCircle, Trash2, ImageIcon, EyeOff, Loader2 } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useRouter } from 'next/navigation'
import { 
    deleteImageTestimonials, 
    deleteImageTestimonial, 
    toggleImageTestimonial, 
    uploadImageTestimonial,
    blurTestimonialPhoneNumber,
    blurAllTestimonialPhoneNumbers
} from '@/lib/actions/image-testimonials'

interface ImageTestimonial {
    id: string
    customerName: string
    imageUrl: string
    isApproved: boolean
    createdAt: Date
}

export default function ImageTestimonialsTable({ testimonials }: { testimonials: ImageTestimonial[] }) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isBlurringAll, setIsBlurringAll] = useState(false)
    const [blurringId, setBlurringId] = useState<string | null>(null)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const router = useRouter()

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(testimonials.map(t => t.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.size} avis image ?`)) return

        setIsDeleting(true)
        const res = await deleteImageTestimonials(Array.from(selectedIds))
        setIsDeleting(false)

        if (res.success) {
            setSelectedIds(new Set())
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleBlurSingle = async (id: string) => {
        setBlurringId(id)
        const res = await blurTestimonialPhoneNumber(id)
        setBlurringId(null)
        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleBlurAll = async () => {
        if (!confirm("Voulez-vous flouter le numéro de téléphone WhatsApp de toutes les captures ?")) return
        setIsBlurringAll(true)
        const res = await blurAllTestimonialPhoneNumbers()
        setIsBlurringAll(false)
        if (res.success) {
            alert(`${res.count} capture(s) traitée(s) avec succès.`)
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const file = formData.get('image') as File
        const customerName = formData.get('customerName') as string

        if (!file || !file.size) {
            alert("Veuillez sélectionner une image")
            return
        }
        if (!customerName) {
            alert("Veuillez entrer un nom")
            return
        }

        setIsUploading(true)
        const res = await uploadImageTestimonial(formData)
        setIsUploading(false)

        if (res.success) {
            setShowUploadModal(false)
            setPreviewUrl(null)
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                {selectedIds.size > 0 ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4 w-full">
                        <span className="text-sm font-bold text-blue-800">
                            {selectedIds.size} avis sélectionné(s)
                        </span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                    </div>
                ) : (
                    <div className="w-full flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleBlurAll}
                            disabled={isBlurringAll || testimonials.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {isBlurringAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {isBlurringAll ? 'Floutage en cours...' : 'Flouter tous les numéros'}
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-6 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            + Ajouter capture WhatsApp
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            <tr>
                                <th className="px-6 py-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={testimonials.length > 0 && selectedIds.size === testimonials.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-6">Image</th>
                                <th className="px-10 py-6">Nom Client</th>
                                <th className="px-10 py-6">État</th>
                                <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {testimonials.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <ImageIcon className="w-20 h-20 mb-4" />
                                            <p className="font-black uppercase tracking-widest text-[10px]">Aucune capture WhatsApp</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                testimonials.map((testimonial) => (
                                    <tr key={testimonial.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.has(testimonial.id) ? 'bg-gray-50/50' : ''}`}>
                                        <td className="px-6 py-6">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(testimonial.id)}
                                                onChange={(e) => handleSelect(testimonial.id, e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="relative w-16 h-24 bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:scale-[2] hover:z-10 transition-transform origin-left cursor-pointer">
                                                <ImageWithFallback
                                                    src={testimonial.imageUrl}
                                                    alt="Testimonial Client"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className="font-black text-black uppercase tracking-tight text-xs italic">
                                                {testimonial.customerName}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6">
                                            {testimonial.isApproved ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Validé
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-gray-100 shadow-sm">
                                                    Masqué
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleBlurSingle(testimonial.id)}
                                                    disabled={blurringId === testimonial.id}
                                                    className="p-3 bg-white text-gray-700 border border-gray-100 rounded-xl hover:bg-gray-100 hover:text-black transition-all shadow-sm active:scale-90 disabled:opacity-50"
                                                    title="Flouter le numéro de téléphone WhatsApp"
                                                >
                                                    {blurringId === testimonial.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await toggleImageTestimonial(testimonial.id)
                                                    }}
                                                    className="p-3 bg-white text-black border border-gray-100 rounded-xl hover:bg-black hover:text-white hover:border-black transition-all shadow-sm active:scale-90"
                                                    title={testimonial.isApproved ? 'Masquer' : 'Afficher'}
                                                >
                                                    <CheckCircle className={`w-4 h-4 ${testimonial.isApproved ? 'text-emerald-500' : 'text-gray-300'}`} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Voulez-vous supprimer cet avis image ?')) {
                                                            await deleteImageTestimonial(testimonial.id)
                                                        }
                                                    }}
                                                    className="p-3 bg-white text-red-600 border border-red-50 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-90"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal d'Upload */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
                        <h2 className="text-2xl font-black italic tracking-tighter mb-6">Ajouter Capture WhatsApp</h2>
                        <form onSubmit={handleUploadSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom du Client</label>
                                <input 
                                    name="customerName"
                                    type="text" 
                                    required 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                                    placeholder="Ex: Youssef..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image (Screenshot)</label>
                                <div className="relative group">
                                    <input 
                                        name="image"
                                        type="file"
                                        accept="image/jpeg, image/png, image/webp"
                                        onChange={handleFileChange}
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-black group-hover:bg-gray-50 transition-all overflow-hidden relative">
                                        {previewUrl ? (
                                            <ImageWithFallback src={previewUrl} alt="Preview" className="object-contain w-full h-full" />
                                        ) : (
                                            <>
                                                <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" />
                                                <span className="text-sm font-bold text-gray-400 group-hover:text-black">Cliquez ou glissez l'image</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <input
                                    id="blurPhone"
                                    name="blurPhone"
                                    type="checkbox"
                                    defaultChecked
                                    value="true"
                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                />
                                <label htmlFor="blurPhone" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                    Flouter le numéro de téléphone WhatsApp (recommandé)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false)
                                        setPreviewUrl(null)
                                    }}
                                    className="px-6 py-3 font-bold text-gray-500 hover:text-black transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="px-6 py-3 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUploading ? 'Envoi en cours...' : 'Ajouter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
