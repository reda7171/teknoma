'use client'

import { useState, useRef } from 'react'
import { Trophy, Instagram, Gift, Users, Link as LinkIcon, Loader2, PartyPopper } from 'lucide-react'
import Confetti from 'react-confetti'
import { createGiveaway } from '@/lib/actions/giveaway'
import { useRouter } from 'next/navigation'


export default function GiveawayClient() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [postUrl, setPostUrl] = useState('')
    const [prizeDescription, setPrizeDescription] = useState('')
    const [participantsText, setParticipantsText] = useState('')
    
    const [isDrawing, setIsDrawing] = useState(false)
    const [winner, setWinner] = useState<string | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)
    const [currentName, setCurrentName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null)

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Function to parse the textarea content into a unique array of participants
    const getParticipants = () => {
        // split by newline, comma, or space, remove @, remove empty strings, make unique
        const rawList = participantsText.split(/[\n,]+/).map(s => s.trim().replace(/^@/, '')).filter(Boolean)
        return Array.from(new Set(rawList))
    }

    const fetchParticipants = async () => {
        if (!postUrl.trim()) return showToast('Veuillez entrer le lien du post Instagram', 'error')
        if (!postUrl.includes('instagram.com/p/')) return showToast('Lien Instagram invalide (doit contenir /p/...)', 'error')

        setIsFetching(true)
        try {
            const res = await fetch('/api/instagram/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: postUrl })
            })

            const data = await res.json()
            
            if (!res.ok) {
                if (data.needsKey) {
                    return showToast('Veuillez configurer RAPIDAPI_KEY dans votre fichier .env', 'error')
                }
                return showToast(data.error || 'Erreur lors du chargement des commentaires', 'error')
            }

            if (data.usernames && data.usernames.length > 0) {
                const formattedText = data.usernames.map((u: string) => `@${u}`).join('\n')
                setParticipantsText(formattedText)
                showToast(`${data.count} participants chargés avec succès !`, 'success')
            } else {
                showToast('Aucun commentaire trouvé sur ce post.', 'error')
            }

        } catch (error) {
            console.error(error)
            showToast('Erreur de connexion au serveur.', 'error')
        } finally {
            setIsFetching(false)
        }
    }

    const startDraw = async () => {
        const participants = getParticipants()
        
        if (!title.trim()) return showToast('Veuillez entrer un titre pour le concours', 'error')
        if (!prizeDescription.trim()) return showToast('Veuillez définir le cadeau', 'error')
        if (participants.length < 2) return showToast('Il faut au moins 2 participants pour faire un tirage', 'error')

        setIsDrawing(true)
        setWinner(null)
        setShowConfetti(false)

        // Roulette Animation
        let count = 0
        const maxTicks = 40 // how many times names switch
        const finalWinner = participants[Math.floor(Math.random() * participants.length)]
        
        const interval = setInterval(() => {
            const randomParticipant = participants[Math.floor(Math.random() * participants.length)]
            setCurrentName(randomParticipant)
            count++

            if (count > maxTicks) {
                clearInterval(interval)
                setIsDrawing(false)
                setCurrentName(finalWinner)
                setWinner(finalWinner)
                setShowConfetti(true)
                saveGiveaway(finalWinner, participants.length)
            }
        }, 80) // 80ms per tick (fast roulette)
    }

    const saveGiveaway = async (winningUser: string, totalParticipants: number) => {
        setIsSaving(true)
        try {
            await createGiveaway({
                title,
                postUrl,
                prizeDescription,
                participantsCount: totalParticipants,
                winnerUsername: winningUser,
                platform: 'INSTAGRAM',
                status: 'COMPLETED'
            })
            showToast('Gagnant enregistré avec succès !', 'success')
            // Optionnel : on peut rediriger vers la liste après un délai
            // setTimeout(() => router.push('/admin/giveaways'), 5000)
        } catch (error) {
            console.error(error)
            showToast('Erreur lors de la sauvegarde du concours', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {showConfetti && <Confetti recycle={false} numberOfPieces={800} gravity={0.15} />}
            
            {/* Colonne de Configuration */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
                        <Instagram className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Nouveau Tirage Instagram</h2>
                        <p className="text-gray-500 text-sm font-medium">Configurez votre concours</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Titre du Concours</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Concours 10k abonnés"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            disabled={isDrawing || winner !== null}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cadeau à offrir</label>
                        <div className="relative">
                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={prizeDescription}
                                onChange={(e) => setPrizeDescription(e.target.value)}
                                placeholder="Ex: Livre 'L'Art de la Guerre'"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                disabled={isDrawing || winner !== null}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Lien du post Instagram</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="url"
                                    value={postUrl}
                                    onChange={(e) => setPostUrl(e.target.value)}
                                    placeholder="https://instagram.com/p/..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    disabled={isDrawing || winner !== null || isFetching}
                                />
                            </div>
                            <button
                                onClick={fetchParticipants}
                                disabled={isFetching || isDrawing || winner !== null}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                {isFetching ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Instagram className="w-5 h-5" />
                                )}
                                Charger
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-gray-700">Participants</label>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Pseudos chargés automatiquement, ou collez-les manuellement (un par ligne)</p>
                        <textarea
                            value={participantsText}
                            onChange={(e) => setParticipantsText(e.target.value)}
                            placeholder="@utilisateur1&#10;@utilisateur2&#10;utilisateur3"
                            rows={6}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            disabled={isDrawing || winner !== null || isFetching}
                        />
                        <div className="mt-2 text-sm text-gray-500 font-medium flex items-center justify-end gap-1">
                            <Users className="w-4 h-4" />
                            <span>{getParticipants().length} participants uniques</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Colonne de Résultat (Roulette) */}
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden relative">
                
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.03]"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

                <div className="relative z-10 w-full max-w-md flex flex-col items-center">
                    
                    {!isDrawing && !winner ? (
                        // Initial State
                        <div className="text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <PartyPopper className="w-10 h-10 text-indigo-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Prêt pour le tirage ?</h3>
                            <p className="text-gray-500 mb-8 font-medium">Remplissez les informations et lancez la roulette !</p>
                            
                            <button
                                onClick={startDraw}
                                disabled={getParticipants().length < 2 || !title || !prizeDescription}
                                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                Lancer le tirage
                            </button>
                        </div>
                    ) : (
                        // Animation & Winner State
                        <div className="text-center w-full">
                            
                            {isDrawing ? (
                                <h3 className="text-xl font-bold text-gray-500 mb-8 uppercase tracking-widest animate-pulse">
                                    Recherche du gagnant...
                                </h3>
                            ) : (
                                <h3 className="text-2xl font-black text-indigo-600 mb-8 uppercase tracking-widest">
                                    Nous avons un gagnant ! 🎉
                                </h3>
                            )}

                            <div className={`w-full bg-white rounded-3xl p-8 mb-10 shadow-2xl transition-all duration-300 ${winner ? 'scale-110 border-4 border-indigo-500' : 'border border-gray-100'}`}>
                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">
                                    Instagram Handle
                                </div>
                                <div className={`font-black text-gray-900 break-all ${currentName.length > 15 ? 'text-4xl' : 'text-5xl md:text-6xl'}`}>
                                    @{currentName}
                                </div>
                            </div>

                            {winner && (
                                <div className="flex flex-col gap-4 w-full">
                                    <a
                                        href={`https://instagram.com/${winner}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full bg-pink-500 hover:bg-pink-600 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        <Instagram className="w-5 h-5" />
                                        Contacter @{winner}
                                    </a>
                                    
                                    <button
                                        onClick={() => router.push('/admin/giveaways')}
                                        className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 px-6 py-4 rounded-2xl font-bold transition-all"
                                    >
                                        Retour à la liste
                                    </button>

                                    {isSaving && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sauvegarde...
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                    
                </div>
            </div>

            {toast && (
                <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white font-medium animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
