'use client'

import { useState } from 'react'
import { Edit2, Upload, Loader2, Sparkles, Check, Download } from 'lucide-react'
import { upsertAuthorProfile } from '@/lib/actions/admin-authors'
import { uploadAuthorImage } from '@/lib/actions/upload'
import { useUIStore } from '@/store/ui'

export default function EditAuthorClient({ authorName, initialProfile }: { authorName: string, initialProfile: any }) {
    const [editingAuthor, setEditingAuthor] = useState({
        name: authorName,
        bio: initialProfile?.bio || '',
        nationality: initialProfile?.nationality || '',
        birthYear: initialProfile?.birthYear || '',
        image: initialProfile?.image || '',
        quote: initialProfile?.quote || '',
        genres: initialProfile?.genres || ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isGeneratingNationality, setIsGeneratingNationality] = useState(false)
    const [isGeneratingBio, setIsGeneratingBio] = useState(false)
    const [isFetchingOpenLib, setIsFetchingOpenLib] = useState(false)
    const { showNotification } = useUIStore()

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

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

        setIsSaving(true)
        const result = await upsertAuthorProfile({
            name: editingAuthor.name,
            bio: editingAuthor.bio || undefined,
            nationality: editingAuthor.nationality || undefined,
            birthYear: editingAuthor.birthYear ? Number(editingAuthor.birthYear) : undefined,
            image: editingAuthor.image || undefined,
            quote: editingAuthor.quote || undefined,
            genres: editingAuthor.genres || undefined
        })

        if (result.success) {
            showNotification('Profil mis à jour avec succès', 'success')
        } else {
            showNotification(result.error || 'Erreur lors de la sauvegarde', 'error')
        }
        setIsSaving(false)
    }

    const generateNationality = async () => {
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

    const fetchOpenLibraryData = async () => {
        setIsFetchingOpenLib(true);
        try {
            // 1. Search author by name
            const searchRes = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(editingAuthor.name)}`);
            const searchData = await searchRes.json();
            
            if (!searchData.docs || searchData.docs.length === 0) {
                showNotification("Auteur introuvable sur Open Library", "error");
                setIsFetchingOpenLib(false);
                return;
            }
            
            const authorKey = searchData.docs[0].key;
            
            // 2. Fetch author details
            const detailRes = await fetch(`https://openlibrary.org/authors/${authorKey}.json`);
            const detailData = await detailRes.json();
            
            let bio = '';
            if (detailData.bio) {
                bio = typeof detailData.bio === 'string' ? detailData.bio : detailData.bio.value || '';
            }
            
            let birthYear = editingAuthor.birthYear;
            if (detailData.birth_date) {
                const match = detailData.birth_date.match(/\d{4}/);
                if (match) birthYear = match[0];
            }
            
            // 3. Translate bio if it exists and is likely in English (very basic approach: just ask AI to translate)
            if (bio && bio.length > 20) {
                showNotification("Traduction de la bio en cours...", "info");
                try {
                    const transRes = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: `Traduis cette biographie d'auteur en français (ne rajoute pas d'introduction, donne juste le texte traduit) : ${bio.substring(0, 800)}` })
                    });
                    const transData = await transRes.json();
                    if (transData.text) {
                        bio = transData.text.trim();
                    }
                } catch (e) {
                    console.error("Translation failed", e);
                }
            }
            
            setEditingAuthor(prev => ({
                ...prev,
                bio: bio || prev.bio,
                birthYear: birthYear || prev.birthYear,
                image: prev.image || `https://covers.openlibrary.org/a/olid/${authorKey}-L.jpg`
            }));
            
            showNotification("Données importées avec succès", "success");
        } catch (err) {
            console.error(err);
            showNotification("Erreur lors de la récupération des données", "error");
        }
        setIsFetchingOpenLib(false);
    };

    return (
        <form onSubmit={handleSave} className="p-8 md:p-12 space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 mb-8 shadow-inner">
                <div>
                    <h3 className="font-black text-sm text-black">Assistant Open Library</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Récupérez photo, bio et dates automatiquement</p>
                </div>
                <button
                    type="button"
                    onClick={fetchOpenLibraryData}
                    disabled={isFetchingOpenLib}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-md"
                >
                    {isFetchingOpenLib ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Importer les données
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                {/* Photo Upload Premium */}
                <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Visuel Auteur</label>
                    <div className="relative group">
                        <div className="w-full aspect-[4/5] rounded-[3rem] bg-gray-50 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-black group-hover:bg-white relative shadow-inner">
                            {editingAuthor.image ? (
                                <>
                                    <img src={editingAuthor.image} alt="" className="w-full h-full object-cover unoptimized" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Edit2 className="w-10 h-10 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4 p-8 text-center">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <Upload className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">DÉPOSER UNE IMAGE</p>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-20">
                                    <Loader2 className="w-10 h-10 text-black animate-spin" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    {/* Nationality & Year */}
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Nationalité</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={editingAuthor.nationality}
                                    onChange={(e) => setEditingAuthor({ ...editingAuthor, nationality: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={generateNationality}
                                    disabled={isGeneratingNationality}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-colors disabled:opacity-50"
                                    title="Générer avec l'IA"
                                >
                                    {isGeneratingNationality ? <Loader2 className="w-4 h-4 animate-spin text-pixio-yellow" /> : <Sparkles className="w-4 h-4 text-gray-400" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Année naiss.</label>
                            <input
                                type="number"
                                value={editingAuthor.birthYear || ''}
                                onChange={(e) => setEditingAuthor({ ...editingAuthor, birthYear: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Bio with AI */}
                    <div className="space-y-2 relative">
                        <div className="flex justify-between items-center ml-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Biographie</label>
                            <button
                                type="button"
                                onClick={generateBio}
                                disabled={isGeneratingBio}
                                className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-pixio-yellow hover:text-black transition-colors disabled:opacity-50"
                            >
                                {isGeneratingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Générer IA
                            </button>
                        </div>
                        <textarea
                            value={editingAuthor.bio}
                            onChange={(e) => setEditingAuthor({ ...editingAuthor, bio: e.target.value })}
                            rows={8}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-medium text-sm leading-relaxed shadow-inner resize-none"
                            placeholder="Écrivez la biographie ici..."
                        />
                    </div>
                </div>
            </div>

            {/* Quote */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Citation célèbre</label>
                <textarea
                    value={editingAuthor.quote || ''}
                    onChange={(e) => setEditingAuthor({ ...editingAuthor, quote: e.target.value })}
                    rows={2}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-medium text-sm italic shadow-inner resize-none"
                    placeholder="Une citation marquante de l'auteur..."
                />
            </div>

            {/* Genres */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Genres (séparés par des virgules)</label>
                <input
                    type="text"
                    value={editingAuthor.genres || ''}
                    onChange={(e) => setEditingAuthor({ ...editingAuthor, genres: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm shadow-inner"
                    placeholder="ex: Développement personnel, Entrepreneuriat"
                />
            </div>

            {/* Save Actions */}
            <div className="flex justify-end pt-8 mt-8 border-t border-gray-100">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Check className="w-5 h-5" />
                    )}
                    Sauvegarder les modifications
                </button>
            </div>
        </form>
    )
}
