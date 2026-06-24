'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, X, Image as ImageIcon, Send, Facebook, Instagram, Music, AtSign } from 'lucide-react'
import Image from 'next/image'

interface ScheduledPost {
    id: string
    date: Date
    time: string
    content: string | null
    platforms: string[]
    mediaUrl: string | null
}

interface Asset {
    name: string
    url: string
    type: string
    createdAt: string
}

export default function PlanningPage() {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [posts, setPosts] = useState<ScheduledPost[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Assets from marketing
    const [assets, setAssets] = useState<Asset[]>([])
    const [showAssetsGrid, setShowAssetsGrid] = useState(false)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTime, setSelectedTime] = useState('12:00')
    const [newPostContent, setNewPostContent] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
    const [selectedMedia, setSelectedMedia] = useState<Asset | null>(null)

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const res = await fetch('/api/admin/marketing/assets')
                const data = await res.json()
                if (data.success) {
                    setAssets(data.assets)
                }
            } catch (error) {
                console.error('Failed to fetch assets:', error)
            }
        }
        fetchAssets()
    }, [])

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await fetch('/api/admin/planning')
                const data = await res.json()
                if (data.success) {
                    setPosts(data.posts.map((p: any) => ({
                        ...p,
                        date: new Date(p.date),
                        platforms: JSON.parse(p.platforms)
                    })))
                }
            } catch (error) {
                console.error('Failed to fetch posts:', error)
            }
        }
        fetchPosts()
        
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    // Generate 15-min intervals
    const timeSlots = []
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, '0')
            const min = m.toString().padStart(2, '0')
            timeSlots.push(`${hour}:${min}`)
        }
    }

    const nextDay = () => {
        const next = new Date(selectedDate)
        next.setDate(next.getDate() + 1)
        setSelectedDate(next)
    }

    const prevDay = () => {
        const prev = new Date(selectedDate)
        prev.setDate(prev.getDate() - 1)
        setSelectedDate(prev)
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date)
    }

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate()
    }

    const handleOpenModal = (time: string) => {
        if (isPastTime(time)) {
            alert('Vous ne pouvez pas programmer dans le passé.')
            return
        }
        setSelectedTime(time)
        setNewPostContent('')
        setSelectedMedia(null)
        setShowAssetsGrid(false)
        setIsModalOpen(true)
    }

    const isPastTime = (time: string) => {
        if (!isSameDay(selectedDate, new Date())) return selectedDate < new Date()
        const [hours, minutes] = time.split(':')
        const slotDate = new Date(selectedDate)
        slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
        return slotDate < new Date()
    }

    const handleDeletePost = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Supprimer cette publication programmée ?')) return
        try {
            await fetch(`/api/admin/planning/${id}`, { method: 'DELETE' })
            setPosts(prev => prev.filter(p => p.id !== id))
        } catch (error) {
            console.error('Erreur de suppression:', error)
        }
    }

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platform) 
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        )
    }

    const handleSavePost = async () => {
        if (!newPostContent.trim() && !selectedMedia) return

        const [hours, minutes] = selectedTime.split(':')
        const scheduleAt = new Date(selectedDate)
        scheduleAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)

        try {
            const res = await fetch('/api/admin/planning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: scheduleAt.toISOString(),
                    time: selectedTime,
                    content: newPostContent,
                    platforms: selectedPlatforms,
                    mediaUrl: selectedMedia?.url
                })
            })
            const data = await res.json()
            if (data.success) {
                setPosts(prev => [...prev, { ...data.post, date: new Date(data.post.date), platforms: JSON.parse(data.post.platforms) }])
            }
        } catch (error) {
            console.error('Erreur sauvegarde DB:', error)
        }

        setIsModalOpen(false)
        
        // Appel API n8n via notre backend pour chaque plateforme choisie
        for (const platform of selectedPlatforms) {
            try {
                await fetch('/api/n8n/publish', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customImageUrl: selectedMedia?.url || '',
                        customCaption: newPostContent,
                        platform: platform,
                        format: 'post',
                        scheduleAt: scheduleAt.toISOString()
                    }) 
                })
            } catch (error) {
                console.error('Erreur programmation pour', platform, error)
            }
        }
    }

    const getPostsForTime = (time: string) => {
        return posts.filter(post => isSameDay(post.date, selectedDate) && post.time === time)
    }

    const getImageUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('http')) return url
        if (url.startsWith('data:image')) return url
        if (url.startsWith('/uploads')) return url
        if (url.startsWith('uploads')) return `/${url}`
        return `/uploads/books/${url}`
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                        Planning (n8n)
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Programmez vos publications automatiques par intervalles de 15 minutes.
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenModal('12:00')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nouveau Post</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <button onClick={prevDay} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 capitalize">
                            {formatDate(selectedDate)}
                        </h2>
                    </div>

                    <button onClick={nextDay} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid */}
                <div className="h-[600px] overflow-y-auto custom-scrollbar p-4 relative">
                    {isSameDay(selectedDate, new Date()) && (
                        <div 
                            className="absolute left-20 right-4 h-0.5 bg-red-500 z-20 pointer-events-none"
                            style={{ 
                                top: `${16 + (currentTime.getHours() * 4 + currentTime.getMinutes() / 15) * 48}px`,
                                boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                            }}
                        >
                            <div className="absolute -left-2 -top-1 w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                        </div>
                    )}
                    <div className="flex flex-col space-y-1 relative z-10">
                        {timeSlots.map((time) => {
                            const isHour = time.endsWith(':00')
                            const slotPosts = getPostsForTime(time)

                            return (
                                <div key={time} className="flex group min-h-[48px]">
                                    <div className="w-20 shrink-0 text-right pr-4 py-3 border-r border-slate-200">
                                        {isHour ? (
                                            <span className="text-sm font-bold text-slate-700">{time}</span>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400">{time}</span>
                                        )}
                                    </div>
                                    <div 
                                        onClick={() => handleOpenModal(time)}
                                        className={`flex-1 border-b border-slate-100 group-hover:bg-blue-50/50 transition-colors cursor-pointer relative rounded-r-lg p-2 ${isPastTime(time) ? 'bg-slate-50/50 opacity-60' : ''}`}
                                    >
                                        {!isPastTime(time) && (
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-blue-500 font-bold text-xs gap-1 transition-opacity z-0 pointer-events-none">
                                                <Plus className="w-3 h-3" /> Programmer
                                            </div>
                                        )}
                                        
                                        {/* Scheduled Posts */}
                                        <div className="relative z-10 flex flex-col gap-2">
                                            {slotPosts.map(post => (
                                                <div key={post.id} className="bg-blue-100 border border-blue-200 text-blue-800 p-2 rounded-lg text-sm shadow-sm flex items-start gap-3 group/post" onClick={e => e.stopPropagation()}>
                                                    {post.mediaUrl && (
                                                        <div className="w-10 h-10 relative rounded border border-blue-200 shrink-0 overflow-hidden">
                                                            <Image src={getImageUrl(post.mediaUrl)} alt="media" fill className="object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium line-clamp-1">{post.content || 'Créative sans texte'}</p>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <div className="flex gap-1">
                                                                {post.platforms.includes('facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
                                                                {post.platforms.includes('instagram') && <Instagram className="w-3 h-3 text-pink-600" />}
                                                                {post.platforms.includes('tiktok') && <Music className="w-3 h-3 text-slate-900" />}
                                                                {post.platforms.includes('threads') && <AtSign className="w-3 h-3 text-slate-900" />}
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDeletePost(post.id, e)}
                                                                className="text-red-500 opacity-0 group-hover/post:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                                                title="Annuler/Supprimer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                Programmer à {selectedTime}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Plateformes</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => togglePlatform('facebook')}
                                        className={`p-2 rounded-lg border ${selectedPlatforms.includes('facebook') ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => togglePlatform('instagram')}
                                        className={`p-2 rounded-lg border ${selectedPlatforms.includes('instagram') ? 'border-pink-600 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => togglePlatform('tiktok')}
                                        className={`p-2 rounded-lg border ${selectedPlatforms.includes('tiktok') ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Music className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => togglePlatform('threads')}
                                        className={`p-2 rounded-lg border ${selectedPlatforms.includes('threads') ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <AtSign className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu du post</label>
                                <textarea 
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="Qu'allez-vous annoncer ?"
                                    className="w-full border border-slate-200 rounded-xl p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Média</label>
                                {selectedMedia ? (
                                    <div className="relative border border-slate-200 rounded-xl p-2 flex items-start gap-3 bg-slate-50">
                                        <div className="w-16 h-16 relative rounded-lg border border-slate-200 overflow-hidden shrink-0">
                                            <Image src={getImageUrl(selectedMedia.url)} alt={selectedMedia.name} fill className="object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{selectedMedia.name}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedMedia(null)}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setShowAssetsGrid(!showAssetsGrid)}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Sélectionner depuis Marketing
                                    </button>
                                )}

                                {showAssetsGrid && !selectedMedia && (
                                    <div className="mt-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {assets.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-4">Aucune créative trouvée. Allez dans Marketing pour en ajouter.</p>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {assets.map(asset => (
                                                    <div 
                                                        key={asset.name}
                                                        onClick={() => {
                                                            setSelectedMedia(asset)
                                                            setShowAssetsGrid(false)
                                                        }}
                                                        className="aspect-square relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors group"
                                                    >
                                                        <Image src={getImageUrl(asset.url)} alt={asset.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 z-10">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleSavePost}
                                className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
