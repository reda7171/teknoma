'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, BookOpen, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function SellBookClient({ locale }: { locale: string }) {
    const t = useTranslations('Nav')
    const router = useRouter()
    
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')
    
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        category: '',
        condition: 'GOOD',
        price: '',
        fullName: '',
        phone: ''
    })
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('L\'image ne doit pas dépasser 5MB.')
                return
            }
            setImageFile(file)
            const url = URL.createObjectURL(file)
            setImagePreview(url)
            setError('')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (!imageFile) {
            setError('Veuillez ajouter une photo de votre livre.')
            return
        }

        setIsSubmitting(true)

        const data = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value)
        })
        data.append('image', imageFile)

        try {
            const res = await fetch('/api/public/sell-book', {
                method: 'POST',
                body: data
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Une erreur est survenue')
            }

            setIsSuccess(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full font-sans">
            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-pixio-dark mb-4">
                        Vendez vos livres d'occasion
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Donnez une seconde vie à vos livres. Remplissez ce formulaire, nous validerons votre annonce et elle sera publiée sur notre boutique.
                    </p>
                </div>

                {isSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-3xl p-12 text-center shadow-lg">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-900 mb-4">Félicitations !</h2>
                        <p className="text-green-800 text-lg mb-8 max-w-md mx-auto">
                            Votre livre a été soumis avec succès. Notre équipe va examiner votre annonce et elle sera publiée très prochainement.
                        </p>
                        <button 
                            onClick={() => {
                                setIsSuccess(false)
                                setFormData({ title: '', author: '', description: '', category: '', condition: 'GOOD', price: '', fullName: '', phone: '' })
                                setImageFile(null)
                                setImagePreview(null)
                            }}
                            className="inline-flex px-8 py-4 bg-pixio-dark text-white rounded-full font-bold hover:bg-black transition-colors"
                        >
                            Vendre un autre livre
                        </button>
                        <div className="mt-4">
                            <Link href={`/${locale}`} className="text-pixio-primary font-bold hover:underline">
                                Retour à l'accueil
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="p-8 md:p-12 space-y-10">
                            
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Section: Image */}
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-pixio-primary/20 text-pixio-primary flex items-center justify-center text-sm">1</span>
                                    Photo du livre
                                </h3>
                                <div className="flex justify-center">
                                    <div className="w-full max-w-sm">
                                        <label className="block w-full cursor-pointer relative group">
                                            {imagePreview ? (
                                                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-bold bg-white/20 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2">
                                                            <Camera className="w-4 h-4" /> Changer l'image
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-[3/4] w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-500 group-hover:bg-gray-100 group-hover:border-pixio-primary transition-colors">
                                                    <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-pixio-primary transition-colors" />
                                                    <span className="font-bold">Ajouter une photo</span>
                                                    <span className="text-xs mt-2 text-gray-400">JPG, PNG, WEBP (Max 5MB)</span>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/jpeg,image/png,image/webp" 
                                                className="hidden" 
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* Section: Details du livre */}
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-pixio-primary/20 text-pixio-primary flex items-center justify-center text-sm">2</span>
                                    Détails du livre
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Titre du livre <span className="text-red-500">*</span></label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="Ex: L'Étranger"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Auteur <span className="text-red-500">*</span></label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="Ex: Albert Camus"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.author}
                                            onChange={e => setFormData({...formData, author: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-700">Description ou résumé (optionnel)</label>
                                        <textarea 
                                            rows={3}
                                            placeholder="Parlez un peu du livre ou de pourquoi vous l'avez aimé..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Catégorie</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            <option value="">Sélectionner une catégorie</option>
                                            <option value="Romans">Romans & Fiction</option>
                                            <option value="Développement Personnel">Développement Personnel</option>
                                            <option value="Religion & Spiritualité">Religion & Spiritualité</option>
                                            <option value="Business">Business</option>
                                            <option value="Histoire">Histoire</option>
                                            <option value="Philosophie">Philosophie</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">État du livre <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.condition}
                                            onChange={e => setFormData({...formData, condition: e.target.value})}
                                        >
                                            <option value="GOOD">Bon état (Quelques marques mineures)</option>
                                            <option value="USED">Déjà utilisé (Marques visibles)</option>
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Prix souhaité (DH) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                required 
                                                type="number" 
                                                min="1"
                                                step="1"
                                                placeholder="Ex: 50"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none pr-16"
                                                value={formData.price}
                                                onChange={e => setFormData({...formData, price: e.target.value})}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                MAD
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* Section: Contact */}
                            <section>
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-pixio-primary/20 text-pixio-primary flex items-center justify-center text-sm">3</span>
                                    Vos coordonnées
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Nom complet <span className="text-red-500">*</span></label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="Votre nom"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.fullName}
                                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Numéro de téléphone <span className="text-red-500">*</span></label>
                                        <input 
                                            required 
                                            type="tel" 
                                            placeholder="Ex: 0612345678"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pixio-primary focus:border-transparent transition-all outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="group flex items-center gap-3 px-8 py-4 bg-pixio-primary text-black font-bold rounded-xl hover:bg-pixio-dark hover:text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Publication en cours...
                                    </>
                                ) : (
                                    <>
                                        Soumettre l'annonce
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    )
}
