'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, X, Play, Pause, Loader2 } from 'lucide-react'
import { createAudioTestimonial, deleteAudioTestimonial, toggleAudioTestimonialStatus } from '@/lib/actions/audio-testimonials'
import { uploadAudioTestimonial } from '@/lib/actions/upload-audio'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export default function AudioTestimonialsTable({ testimonials }: { testimonials: any[] }) {
    const router = useRouter()
    const t = useTranslations('Admin')
    const [isUploading, setIsUploading] = useState(false)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        const name = formData.get('name') as string
        const file = formData.get('audio') as File

        if (!name || !file || file.size === 0) return

        setIsUploading(true)
        try {
            // Upload file
            const uploadFormData = new FormData()
            uploadFormData.append('audio', file)
            const uploadRes = await uploadAudioTestimonial(uploadFormData)

            if (!uploadRes.success) throw new Error(uploadRes.error)

            // Create testimonial
            const res = await createAudioTestimonial({
                customerName: name,
                audioUrl: uploadRes.audioUrl!
            })

            if (!res.success) throw new Error(res.error)

            form.reset()
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Erreur lors de l'ajout")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cet audio ?')) return
        const res = await deleteAudioTestimonial(id)
        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleToggleStatus = async (id: string, isApproved: boolean) => {
        const res = await toggleAudioTestimonialStatus(id, isApproved)
        if (res.success) {
            router.refresh()
        }
    }

    const handlePlay = (id: string, url: string) => {
        if (playingId === id && audioElement) {
            audioElement.pause()
            setPlayingId(null)
            return
        }

        if (audioElement) {
            audioElement.pause()
        }

        const audio = new Audio(url)
        audio.play()
        setAudioElement(audio)
        setPlayingId(id)

        audio.onended = () => {
            setPlayingId(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Formulaire d'ajout */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-black mb-4">Ajouter un Audio</h3>
                <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Nom du client
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black transition-colors font-medium text-black"
                            placeholder="Ex: Amira L."
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Fichier Audio (MP3, OGG, WAV)
                        </label>
                        <input
                            type="file"
                            name="audio"
                            accept="audio/*"
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black transition-colors text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="px-8 py-3 bg-black text-white text-sm font-bold rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2 h-[50px]"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        <span>Ajouter</span>
                    </button>
                </form>
            </div>

            {/* Liste des Audios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative group flex flex-col justify-between min-h-[160px]">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-black">{testimonial.customerName}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${testimonial.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {testimonial.isApproved ? 'En ligne' : 'Masqué'}
                                </span>
                            </div>

                            {/* Lecteur style WhatsApp */}
                            <div className="bg-[#E7FFDB] p-2 rounded-2xl rounded-tr-none flex items-center gap-3 w-fit shadow-sm relative">
                                <button 
                                    onClick={() => handlePlay(testimonial.id, testimonial.audioUrl)}
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm hover:scale-105 transition-transform"
                                >
                                    {playingId === testimonial.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                                </button>
                                <div className="flex-1 w-[120px]">
                                    <div className="w-full h-1 bg-green-200 rounded-full overflow-hidden">
                                        <div className={`h-full bg-green-500 rounded-full transition-all duration-300 ${playingId === testimonial.id ? 'w-full animate-pulse' : 'w-0'}`} />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-500 font-medium">0:00</span>
                                    </div>
                                </div>
                                <div className="absolute -right-2 top-0 w-4 h-4 bg-[#E7FFDB] style-triangle" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleToggleStatus(testimonial.id, !testimonial.isApproved)}
                                className={`p-2 rounded-xl transition-colors ${testimonial.isApproved ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                title={testimonial.isApproved ? "Masquer" : "Afficher"}
                            >
                                {testimonial.isApproved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => handleDelete(testimonial.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {testimonials.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 font-medium text-sm">
                        Aucun témoignage audio pour le moment.
                    </div>
                )}
            </div>
        </div>
    )
}
