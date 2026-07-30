'use client'

import { useState } from 'react'
import { Search, Edit2, Globe, Calendar, User, Check, X, Upload, Loader2, Sparkles } from 'lucide-react'
import { upsertAuthorProfile } from '@/lib/actions/admin-authors'
import { uploadAuthorImage } from '@/lib/actions/upload'
import { useUIStore } from '@/store/ui'
import ImageWithFallback from '@/components/ImageWithFallback'

interface Author {
    name: string
    bookCount: number
    bio: string | null
    image: string | null
    nationality: string | null
    birthYear: number | null
    quote: string | null
    genres: string | null
    hasProfile: boolean
}

export default function AuthorsList({ initialAuthors }: { initialAuthors: Author[] }) {
    const [authors, setAuthors] = useState<Author[]>(initialAuthors)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingAuthor, setEditingAuthor] = useState<Author | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isGeneratingNationality, setIsGeneratingNationality] = useState(false)
    const [isGeneratingBio, setIsGeneratingBio] = useState(false)
    const { showNotification } = useUIStore()

    const filteredAuthors = authors.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !editingAuthor) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('image', file)

        const result = await uploadAuthorImage(formData)
        if (result.success && result.imageUrl) {
            setEditingAuthor({ ...editingAuthor, image: result.imageUrl })
            showNotification('Image téléchargée', 'success')
        } else {
            showNotification(result.error || "Erreur d'upload", 'error')
        }
        setIsUploading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingAuthor) return

        setIsSaving(true)
        const result = await upsertAuthorProfile({
            name: editingAuthor.name,
            bio: editingAuthor.bio || undefined,
            nationality: editingAuthor.nationality || undefined,
            birthYear: editingAuthor.birthYear || undefined,
            image: editingAuthor.image || undefined,
            quote: editingAuthor.quote || undefined,
            genres: editingAuthor.genres || undefined
        })

        if (result.success) {
            showNotification('Profil mis à jour avec succès', 'success')
            // Update local state
            setAuthors(prev => prev.map(a => 
                a.name === editingAuthor.name ? { ...editingAuthor, hasProfile: true } : a
            ))
            setEditingAuthor(null)
        } else {
            showNotification(result.error || 'Erreur lors de la sauvegarde', 'error')
        }
        setIsSaving(false)
    }

    const generateNationality = async () => {
        if (!editingAuthor) return;
        setIsGeneratingNationality(true);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `Donne-moi uniquement la nationalité (un seul mot) de l'auteur ${editingAuthor.name}. Si tu ne sais pas, réponds Inconnue.` })
            });
            const data = await res.json();
            if (data.text) {
                setEditingAuthor({ ...editingAuthor, nationality: data.text.replace(/\./g, '').trim() });
                showNotification('Nationalité générée', 'success');
            }
        } catch (err) {
            showNotification('Erreur de génération', 'error');
        }
        setIsGeneratingNationality(false);
    };

    const generateBio = async () => {
        if (!editingAuthor) return;
        setIsGeneratingBio(true);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `Rédige une biographie professionnelle et captivante pour l'auteur ${editingAuthor.name} en français (environ 3 à 4 phrases). N'inclus pas d'introduction ou de conclusion comme "Voici la biographie".` })
            });
            const data = await res.json();
            if (data.text) {
                setEditingAuthor({ ...editingAuthor, bio: data.text.trim() });
                showNotification('Biographie générée', 'success');
            }
        } catch (err) {
            showNotification('Erreur de génération', 'error');
        }
        setIsGeneratingBio(false);
    };

    return (
        <div className="space-y-8">
            {/* Search Bar Premium */}
            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 transition-colors group-focus-within:text-black" />
                <input
                    type="text"
                    placeholder="RECHERCHER UN AUTEUR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/5"
                />
            </div>

            {/* List Container Premium */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 md:px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Identité</th>
                            <th className="hidden sm:table-cell px-6 md:px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Catalogue</th>
                            <th className="hidden md:table-cell px-6 md:px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Statut Bio</th>
                            <th className="px-6 md:px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredAuthors.map((author) => (
                            <tr key={author.name} className="hover:bg-gray-50/50 transition-all group">
                                <td className="px-6 md:px-10 py-6">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-gray-100 shadow-lg shadow-black/10 transition-transform group-hover:scale-110 shrink-0">
                                            {author.image ? (
                                                <img src={author.image} alt={author.name} className="w-full h-full object-cover unoptimized" />
                                            ) : (
                                                <User className="w-5 h-5 md:w-6 md:h-6 text-white/20" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-[10px] text-black uppercase tracking-tight italic truncate max-w-[120px] md:max-w-none">{author.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{author.nationality || 'Origine non spécifiée'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-6 md:px-10 py-6">
                                    <span className="inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest shadow-sm">
                                        {author.bookCount} LIVRES
                                    </span>
                                </td>
                                <td className="hidden md:table-cell px-6 md:px-10 py-6">
                                    {author.hasProfile ? (
                                        <span className="inline-flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                            <Check className="w-3 h-3" /> COMPLET
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 text-orange-400 text-[9px] font-black uppercase tracking-widest italic opacity-60">
                                            <X className="w-3 h-3" /> À REMPLIR
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 md:px-10 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <a 
                                            href={`/authors/${encodeURIComponent(author.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
                                        >
                                            <Globe className="w-3 h-3" />
                                            <span className="hidden sm:inline">Visualiser</span>
                                        </a>
                                        <a 
                                            href={`/admin/authors/edit/${encodeURIComponent(author.name)}`}
                                            className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            <span className="hidden sm:inline">Modifier</span>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    )
}

