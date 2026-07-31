'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, X, Image as ImageIcon, Send, Facebook, Instagram, Music, AtSign, CheckCircle, AlertCircle, Loader2, Edit2, RefreshCw, Filter, Smartphone, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface ScheduledPost {
    id: string
    date: Date
    time: string
    content: string | null
    platforms: string[]
    mediaUrl: string | null
    status: string
}

interface Asset {
    name: string
    url: string
    type: string
    createdAt: string
}

export interface SuggestedBook {
    id: string
    title: string
    image: string
    author: string
    isProgrammed: boolean
    type?: 'book' | 'pack'
    stock?: number
}

export default function PlanningClient({ initialPosts, availableBooks = [] }: { initialPosts: ScheduledPost[], availableBooks?: any[] }) {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [posts, setPosts] = useState<ScheduledPost[]>(() => {
        return initialPosts.map(p => {
            let parsedPlatforms: string[] = []
            try {
                parsedPlatforms = typeof p.platforms === 'string' ? JSON.parse(p.platforms) : p.platforms
            } catch {
                parsedPlatforms = []
            }
            return {
                ...p,
                date: new Date(p.date),
                platforms: parsedPlatforms,
                status: p.status || 'PENDING'
            }
        })
    })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null)
    
    // Assets from marketing
    const [assets, setAssets] = useState<Asset[]>([])
    const [showAssetsGrid, setShowAssetsGrid] = useState(false)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTime, setSelectedTime] = useState('12:00')
    const [newPostContent, setNewPostContent] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram', 'tiktok', 'threads'])
    const [selectedMedia, setSelectedMedia] = useState<Asset | null>(null)
    const [editingPostId, setEditingPostId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
    const [platformFilter, setPlatformFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dailySuggestions, setDailySuggestions] = useState<SuggestedBook[]>([])

    const scrollRef = useRef<HTMLDivElement>(null)

    const seededRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

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
        
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const generateSuggestions = (seed?: number) => {
        if (!availableBooks || availableBooks.length === 0) return;
        
        // Exclure les articles avec un stock de 0
        const inStockItems = availableBooks.filter(item => item.stock === undefined || item.stock > 0);
        if (inStockItems.length === 0) return;

        const currentSeed = seed || new Date().getTime();
        let s = currentSeed;
        const shuffled = [...inStockItems].sort(() => 0.5 - seededRandom(s++));
        const picked = shuffled.slice(0, 3);
        const newSuggestions = picked.map(book => {
            const isProgrammed = posts.some(post => 
                (post.mediaUrl && post.mediaUrl.includes(book.image)) || 
                (post.content && post.content.includes(book.title))
            );
            return { ...book, isProgrammed };
        });
        setDailySuggestions(newSuggestions);
    };

    useEffect(() => {
        const today = new Date();
        const seedStr = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
        generateSuggestions(parseInt(seedStr, 10));
    }, [availableBooks]);

    useEffect(() => {
        if (dailySuggestions.length > 0) {
            setDailySuggestions(prev => prev.map(book => {
                const isProgrammed = posts.some(post => 
                    (post.mediaUrl && post.mediaUrl.includes(book.image)) || 
                    (post.content && post.content.includes(book.title))
                );
                return { ...book, isProgrammed };
            }));
        }
    }, [posts]);

    useEffect(() => {
        if (scrollRef.current && isSameDay(selectedDate, new Date())) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [selectedDate])

    // Generate 15-min intervals with useMemo for performance
    const timeSlots = useMemo(() => {
        const slots = []
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const hour = h.toString().padStart(2, '0')
                const min = m.toString().padStart(2, '0')
                slots.push(`${hour}:${min}`)
            }
        }
        return slots
    }, [])

    const nextDay = () => {
        const next = new Date(selectedDate)
        if (viewMode === 'month') next.setMonth(next.getMonth() + 1)
        else next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 1))
        setSelectedDate(next)
    }

    const prevDay = () => {
        const prev = new Date(selectedDate)
        if (viewMode === 'month') prev.setMonth(prev.getMonth() - 1)
        else prev.setDate(prev.getDate() - (viewMode === 'week' ? 7 : 1))
        setSelectedDate(prev)
    }

    const formatDate = (date: Date) => {
        if (viewMode === 'month') {
            return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
        }
        if (viewMode === 'week') {
            const start = getStartOfWeek(date)
            const end = new Date(start)
            end.setDate(end.getDate() + 6)
            return `Semaine du ${start.getDate()} au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(end)}`
        }
        return new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date)
    }

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
        return new Date(d.setDate(diff))
    }

    const weekDays = useMemo(() => {
        const start = getStartOfWeek(selectedDate)
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            return d
        })
    }, [selectedDate])

    const monthDays = useMemo(() => {
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        
        // Find the Monday before the 1st
        const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
        const start = new Date(year, month, 1 - startOffset)
        
        // Find the Sunday after the last day
        const endOffset = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay()
        const end = new Date(year, month, lastDay.getDate() + endOffset)
        
        const days = []
        let current = new Date(start)
        while (current <= end) {
            days.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        return days
    }, [selectedDate])

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate()
    }

    const handleOpenModal = (time: string, postToEdit?: ScheduledPost) => {
        if (postToEdit) {
            setEditingPostId(postToEdit.id)
            setSelectedTime(postToEdit.time)
            setNewPostContent(postToEdit.content || '')
            setSelectedPlatforms(postToEdit.platforms && postToEdit.platforms.length > 0 ? postToEdit.platforms : ['facebook', 'instagram', 'tiktok', 'threads'])
            if (postToEdit.mediaUrl) {
                // Find asset or mock it for display
                const foundAsset = assets.find(a => a.url === postToEdit.mediaUrl)
                if (foundAsset) setSelectedMedia(foundAsset)
                else setSelectedMedia({ url: postToEdit.mediaUrl, name: 'Image', type: 'image', createdAt: '' })
            } else {
                setSelectedMedia(null)
            }
        } else {
            setEditingPostId(null)
            setSelectedTime(time)
            setNewPostContent('')
            setSelectedPlatforms(['facebook', 'instagram', 'tiktok', 'threads'])
            setSelectedMedia(null)
        }
        
        setShowAssetsGrid(false)
        setIsModalOpen(true)
    }

    const handleScheduleOnDay = (day: Date, e: React.MouseEvent) => {
        e.stopPropagation()
        // Allow scheduling if it's today or in the future
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const targetDay = new Date(day)
        targetDay.setHours(0, 0, 0, 0)
        
        setSelectedDate(day)
        // Check if 12:00 is past for today, if so use current hour + 1
        let timeToSet = '12:00'
        if (isSameDay(day, new Date())) {
            const currentHour = new Date().getHours()
            if (currentHour >= 12) {
                timeToSet = `${Math.min(23, currentHour + 1).toString().padStart(2, '0')}:00`
            }
        }
        
        // Timeout to let selectedDate state update before opening modal, since handleOpenModal checks isPastTime against selectedDate
        setTimeout(() => handleOpenModal(timeToSet), 0)
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
            showToast('Publication supprimée', 'success')
        } catch (error) {
            showToast('Erreur de suppression', 'error')
        }
    }

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platform) 
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        )
    }

    const handleImageDropOnDay = (e: React.DragEvent, day: Date) => {
        e.preventDefault()
        e.stopPropagation()

        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const targetDay = new Date(day)
        targetDay.setHours(0, 0, 0, 0)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            if (!file.type.startsWith('image/')) {
                showToast('Veuillez déposer une image valide.', 'error')
                return
            }

            const tempUrl = URL.createObjectURL(file)
            const tempMedia = {
                name: file.name,
                url: tempUrl,
                type: 'image',
                createdAt: new Date().toISOString(),
                file: file
            }

            setSelectedDate(day)
            let timeToSet = '12:00'
            if (isSameDay(day, new Date())) {
                const currentHour = new Date().getHours()
                if (currentHour >= 12) {
                    timeToSet = `${Math.min(23, currentHour + 1).toString().padStart(2, '0')}:00`
                }
            }

            setTimeout(() => {
                setEditingPostId(null)
                setSelectedTime(timeToSet)
                setNewPostContent('')
                setSelectedPlatforms(['facebook', 'instagram', 'tiktok', 'threads'])
                setSelectedMedia(tempMedia as any)
                setShowAssetsGrid(false)
                setIsModalOpen(true)
            }, 0)
        }
    }

    const handleImageDrop = (e: React.DragEvent, time: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            if (!file.type.startsWith('image/')) {
                showToast('Veuillez déposer une image valide.', 'error')
                return
            }

            const tempUrl = URL.createObjectURL(file)
            const tempMedia = {
                name: file.name,
                url: tempUrl,
                type: 'image',
                createdAt: new Date().toISOString(),
                file: file
            }

            setEditingPostId(null)
            setSelectedTime(time)
            setNewPostContent('')
            setSelectedPlatforms(['facebook', 'instagram', 'tiktok', 'threads'])
            setSelectedMedia(tempMedia as any)
            setShowAssetsGrid(false)
            setIsModalOpen(true)
        }
    }

    const handleSavePost = async () => {
        if (!newPostContent.trim() && !selectedMedia) return
        
        setIsLoading(true)

        let finalMediaUrl = selectedMedia?.url
        const mediaFile = (selectedMedia as any)?.file
        
        if (mediaFile) {
            const formData = new FormData()
            formData.append('file', mediaFile)
            try {
                const upRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData
                })
                const upData = await upRes.json()
                if (upData.success) {
                    finalMediaUrl = upData.url
                } else {
                    showToast(upData.error || 'Erreur upload', 'error')
                    setIsLoading(false)
                    return
                }
            } catch {
                showToast('Erreur upload', 'error')
                setIsLoading(false)
                return
            }
        }

        const [hours, minutes] = selectedTime.split(':')
        const scheduleAt = new Date(selectedDate)
        scheduleAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)

        const payload = {
            date: scheduleAt.toISOString(),
            time: selectedTime,
            content: newPostContent,
            platforms: selectedPlatforms,
            mediaUrl: finalMediaUrl
        }

        try {
            const url = editingPostId ? `/api/admin/planning/${editingPostId}` : '/api/admin/planning'
            const method = editingPostId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            
            if (data.success) {
                let parsedPlatforms = []
                try {
                    parsedPlatforms = JSON.parse(data.post.platforms)
                } catch {
                    parsedPlatforms = []
                }
                
                const updatedPost = { ...data.post, date: new Date(data.post.date), platforms: parsedPlatforms }
                
                if (editingPostId) {
                    setPosts(prev => prev.map(p => p.id === editingPostId ? updatedPost : p))
                    showToast('Publication modifiée', 'success')
                } else {
                    setPosts(prev => [...prev, updatedPost])
                    showToast('Publication programmée', 'success')
                }
            } else {
                showToast('Erreur lors de la sauvegarde', 'error')
            }
        } catch (error) {
            showToast('Erreur serveur', 'error')
        }

        setIsModalOpen(false)
        setIsLoading(false)
    }

    const handleAutoScheduleAll = async () => {
        console.log('[PlanningClient] Clic sur Auto-programmer détecté ! Lancement...');
        setIsLoading(true);
        const unprogrammed = dailySuggestions.filter(b => !b.isProgrammed);
        if (unprogrammed.length === 0) {
            console.log('[PlanningClient] Toutes les suggestions sont déjà programmées.');
            showToast('Toutes les suggestions sont déjà programmées', 'success');
            setIsLoading(false);
            return;
        }
        
        console.log(`[PlanningClient] ${unprogrammed.length} posts à auto-programmer trouvés.`);

        const possibleTimes = ['10:00', '12:30', '15:00', '18:00', '19:30', '20:00', '21:00'];
        const shuffledTimes = [...possibleTimes].sort(() => 0.5 - Math.random());
        
        let newPostsCount = 0;
        let errorsCount = 0;

        for (let i = 0; i < unprogrammed.length; i++) {
            const book = unprogrammed[i];
            
            if (book.image && book.image.startsWith('data:image')) {
                console.error(`Impossible d'auto-programmer ${book.title}: L'image est en Base64.`);
                errorsCount++;
                continue;
            }
            
            const timeSlot = shuffledTimes[i % shuffledTimes.length];
            const link = `https://riwaya.store/fr/${book.type === 'pack' ? 'packs' : 'book'}/${book.id}`;
            const content = `📚 Découvrez "${book.title}" ${book.type === 'pack' ? '' : `par ${book.author}`} !\n\nDisponible dès maintenant.\n\n🔗 ${link}\n\n#livre #lecture #riwaya`;

            const [hours, minutes] = timeSlot.split(':');
            const scheduleAt = new Date(selectedDate);
            scheduleAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

            const payload = {
                date: scheduleAt.toISOString(),
                time: timeSlot,
                content: content,
                platforms: ['facebook', 'instagram'],
                mediaUrl: book.image
            };

            try {
                const res = await fetch('/api/admin/planning', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    let parsedPlatforms = [];
                    try { parsedPlatforms = JSON.parse(data.post.platforms); } catch { parsedPlatforms = []; }
                    const updatedPost = { ...data.post, date: new Date(data.post.date), platforms: parsedPlatforms };
                    setPosts(prev => [...prev, updatedPost]);
                    newPostsCount++;
                } else {
                    console.error('Erreur API autoplanning:', data.error);
                    errorsCount++;
                }
            } catch (error) {
                console.error('Erreur autoplanning exception:', error);
                errorsCount++;
            }
        }

        if (newPostsCount > 0) {
            showToast(`${newPostsCount} post(s) programmé(s) avec succès${errorsCount > 0 ? ` (${errorsCount} échecs)` : ''}`, 'success');
        } else {
            showToast('Erreur lors de la programmation. Vérifiez les images (Base64 non supporté).', 'error');
        }
        setIsLoading(false);
    }

    const handleClearCalendar = async () => {
        if (!confirm('Voulez-vous vraiment vider tout le calendrier des publications ?')) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/planning', { method: 'DELETE' });
            if (res.ok) {
                setPosts([]);
                showToast('Calendrier vidé avec succès', 'success');
            } else {
                showToast('Erreur lors du nettoyage du calendrier', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erreur lors du nettoyage du calendrier', 'error');
        }
        setIsLoading(false);
    }

    const getPostsForTime = (time: string) => {
        return posts.filter(post => 
            isSameDay(post.date, selectedDate) && 
            post.time === time &&
            (platformFilter === 'all' || post.platforms.includes(platformFilter)) &&
            (statusFilter === 'all' || post.status === statusFilter)
        )
    }

    const getImageUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('http')) return url
        if (url.startsWith('data:image')) return url
        if (url.startsWith('/uploads')) return url
        if (url.startsWith('uploads')) return `/${url}`
        return `/uploads/books/${url}`
    }

    const isVideo = (url: string) => {
        if (!url) return false
        return url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov') || url.toLowerCase().endsWith('.webm')
    }

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        
        const sourceTime = result.source.droppableId;
        const destTime = result.destination.droppableId;
        const postId = result.draggableId;

        if (sourceTime === destTime) return;

        const postToMove = posts.find(p => p.id === postId);
        if (!postToMove) return;

        const originalTime = postToMove.time;
        const originalDate = new Date(postToMove.date);

        const newDate = new Date(selectedDate);
        const [hours, minutes] = destTime.split(':');
        newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        // Optimistic UI update
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, time: destTime, date: newDate } : p));
        showToast(`Post déplacé à ${destTime}`, 'success');

        try {
            await fetch(`/api/admin/planning/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time: destTime, date: newDate.toISOString() })
            });
        } catch (error) {
            // Revert on error
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, time: originalTime, date: originalDate } : p));
            showToast('Erreur lors du déplacement', 'error');
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return <CheckCircle className="w-3 h-3 text-green-500" title="Publié" />
            case 'FAILED': return <AlertCircle className="w-3 h-3 text-red-500" title="Échec de publication" />
            default: return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" title="En attente" />
        }
    }

    return (
        <div className="w-full h-[calc(100vh-100px)] relative flex flex-col">
            {toast && (
                <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 text-white font-medium animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.message}
                </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                        Planning (n8n)
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Gérez vos publications automatiques. Glissez pour déplacer, cliquez pour modifier.
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenModal('12:00')}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 hover:shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Nouveau Post
                </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 md:gap-4 mb-4">
                <div className="flex flex-wrap bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                    <button onClick={() => setPlatformFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${platformFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Tous Réseaux</button>
                    <button onClick={() => setPlatformFilter('facebook')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${platformFilter === 'facebook' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Facebook className="w-3 h-3"/> Facebook</button>
                    <button onClick={() => setPlatformFilter('instagram')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${platformFilter === 'instagram' ? 'bg-pink-50 text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}><Instagram className="w-3 h-3"/> Instagram</button>
                </div>
                <div className="flex flex-wrap bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Tous Statuts</button>
                    <button onClick={() => setStatusFilter('PUBLISHED')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${statusFilter === 'PUBLISHED' ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:text-slate-700'}`}><CheckCircle className="w-3 h-3"/> Publiés</button>
                    <button onClick={() => setStatusFilter('FAILED')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${statusFilter === 'FAILED' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}><AlertCircle className="w-3 h-3"/> Échecs</button>
                </div>
            </div>

            {/* Daily Suggestions */}
            {dailySuggestions.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider">Suggestions du jour</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={handleClearCalendar}
                                disabled={isLoading}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                                title="Vider le calendrier"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Tout Vider
                            </button>
                            <button 
                                onClick={handleAutoScheduleAll}
                                disabled={isLoading}
                                className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200 shadow-sm flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                                title="Programmer aléatoirement"
                            >
                                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Auto-programmer
                            </button>
                            <button 
                                onClick={() => generateSuggestions(new Date().getTime())}
                                className="p-1.5 bg-white/50 hover:bg-white text-blue-600 rounded-lg transition-colors border border-blue-200/50 shadow-sm flex items-center gap-1 text-xs font-bold"
                                title="Rafraîchir les suggestions"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {dailySuggestions.map(book => (
                            <div key={book.id} className={`flex items-center gap-3 p-3 rounded-xl border ${book.isProgrammed ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-200 hover:border-blue-400'} transition-colors relative overflow-hidden group shadow-sm`}>
                                {book.isProgrammed && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                        <CheckCircle className="w-3 h-3" />
                                        Programmé
                                    </div>
                                )}
                                <div className={`w-12 h-16 relative rounded shrink-0 overflow-hidden bg-slate-100 ${book.isProgrammed ? 'opacity-50 grayscale' : ''}`}>
                                    {book.image && getImageUrl(book.image) ? (
                                        <Image src={getImageUrl(book.image)} alt={book.title} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-4 h-4 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 min-w-0 ${book.isProgrammed ? 'opacity-60' : ''}`}>
                                    <p className="font-bold text-slate-900 text-sm truncate">{book.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-slate-500 truncate max-w-[120px]">{book.author}</p>
                                        {book.stock !== undefined && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${book.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Stock: {book.stock}
                                            </span>
                                        )}
                                    </div>
                                    {!book.isProgrammed && (
                                        <button 
                                            onClick={() => {
                                                const timeToSet = '12:00';
                                                handleOpenModal(timeToSet);
                                                setTimeout(() => {
                                                    const link = `https://riwaya.store/fr/${book.type === 'pack' ? 'packs' : 'book'}/${book.id}`;
                                                    setNewPostContent(`📚 Découvrez "${book.title}" ${book.type === 'pack' ? '' : `par ${book.author}`} !\n\nDisponible dès maintenant.\n\n🔗 ${link}\n\n#livre #lecture #riwaya`);
                                                    const newMedia = { name: book.title, url: book.image, type: 'image', createdAt: new Date().toISOString() };
                                                    setSelectedMedia(newMedia as any);
                                                }, 50);
                                            }}
                                            className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                                        >
                                            Programmer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                    <button onClick={prevDay} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 capitalize">
                            {formatDate(selectedDate)}
                        </h2>
                    </div>

                    <div className="flex flex-wrap justify-center bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('day')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Jour
                        </button>
                        <button 
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Semaine
                        </button>
                        <button 
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Mois
                        </button>
                    </div>

                    <button onClick={nextDay} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid */}
                {viewMode === 'day' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
                        {isSameDay(selectedDate, new Date()) && (
                            <div 
                                ref={scrollRef}
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
                                        <div className="w-16 sm:w-20 shrink-0 text-right pr-2 sm:pr-4 py-3 border-r border-slate-200 relative">
                                            {['18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00'].includes(time) && (
                                                <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 text-orange-400" title="Heure recommandée pour l'engagement">
                                                    <Star className="w-3 h-3 fill-orange-400" />
                                                </div>
                                            )}
                                            {isHour ? (
                                                <span className="text-xs sm:text-sm font-bold text-slate-700">{time}</span>
                                            ) : (
                                                <span className="text-[10px] sm:text-xs font-medium text-slate-400">{time}</span>
                                            )}
                                        </div>
                                        <Droppable droppableId={time}>
                                            {(provided, snapshot) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleImageDrop(e, time)}
                                                    className={`flex-1 border-b border-slate-100 group-hover:bg-blue-50/50 transition-colors relative rounded-r-lg p-2 ${isPastTime(time) ? 'bg-slate-50/50 opacity-60' : ''} ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                                >
                                                    {/* Accessible Button to Add Post */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(time)}
                                                        className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-r-lg z-0"
                                                        aria-label={`Programmer à ${time}`}
                                                    >
                                                        <span className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-blue-500 font-bold text-xs gap-1 transition-opacity pointer-events-none h-full">
                                                            <Plus className="w-3 h-3" /> Programmer
                                                        </span>
                                                    </button>
                                                    
                                                    {/* Scheduled Posts */}
                                                    <div className="relative z-10 flex flex-col gap-2">
                                                        {slotPosts.map((post, index) => (
                                                            <Draggable key={post.id} draggableId={post.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div 
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className={`bg-blue-100 border border-blue-200 text-blue-800 p-2 rounded-lg text-sm shadow-sm flex items-start gap-3 group/post cursor-pointer ${snapshot.isDragging ? 'shadow-xl rotate-2 scale-105 z-50' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleOpenModal(post.time, post)
                                                                        }}
                                                                    >
                                                                        {post.mediaUrl && (
                                                                            <div className="w-10 h-10 relative rounded border border-blue-200 shrink-0 overflow-hidden bg-slate-900 flex items-center justify-center">
                                                                                {isVideo(post.mediaUrl) ? (
                                                                                    <span className="text-[8px] font-bold text-white">VIDEO</span>
                                                                                ) : (
                                                                                    <Image src={getImageUrl(post.mediaUrl)} alt="media" fill className="object-cover" />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="font-medium line-clamp-1 flex-1">{post.content || 'Créative sans texte'}</p>
                                                                                {getStatusIcon(post.status)}
                                                                            </div>
                                                                            <div className="flex justify-between items-center mt-1">
                                                                                <div className="flex gap-1">
                                                                                    {post.platforms.includes('facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
                                                                                    {post.platforms.includes('instagram') && <Instagram className="w-3 h-3 text-pink-600" />}
                                                                                    {post.platforms.includes('tiktok') && <Music className="w-3 h-3 text-slate-900" />}
                                                                                    {post.platforms.includes('threads') && <AtSign className="w-3 h-3 text-slate-900" />}
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    <button 
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            handleOpenModal(post.time, post)
                                                                                        }}
                                                                                        className="text-blue-500 opacity-0 group-hover/post:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded"
                                                                                        title="Modifier"
                                                                                    >
                                                                                        <Edit2 className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button 
                                                                                        type="button"
                                                                                        onClick={(e) => handleDeletePost(post.id, e)}
                                                                                        className="text-red-500 opacity-0 group-hover/post:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                                                                        title="Annuler/Supprimer"
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </DragDropContext>
                ) : viewMode === 'week' ? (
                <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-50">
                    <div className="grid grid-cols-7 gap-4 min-w-[800px]">
                        {weekDays.map(day => {
                            const isToday = isSameDay(day, new Date())
                            const dayPosts = posts.filter(p => isSameDay(p.date, day) && (platformFilter === 'all' || p.platforms.includes(platformFilter)) && (statusFilter === 'all' || p.status === statusFilter)).sort((a, b) => a.time.localeCompare(b.time))
                            
                            return (
                                <div 
                                    key={day.toISOString()} 
                                    onClick={(e) => handleScheduleOnDay(day, e)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleImageDropOnDay(e, day)}
                                    className={`flex flex-col bg-white rounded-xl border ${isToday ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200'} overflow-hidden cursor-pointer hover:border-blue-300 transition-colors group/day`}
                                >
                                    <div className={`p-3 text-center border-b relative ${isToday ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                        <div className="text-xs font-bold uppercase">{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</div>
                                        <div className={`text-2xl font-black mt-1 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</div>
                                    </div>
                                    <div className="p-2 flex-1 flex flex-col gap-2 min-h-[150px]">
                                        {dayPosts.map(post => (
                                            <div 
                                                key={post.id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenModal(post.time, post);
                                                }}
                                                className="bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">{post.time}</span>
                                                    {getStatusIcon(post.status)}
                                                </div>
                                                <p className="text-xs text-slate-700 line-clamp-2 leading-tight">{post.content || 'Image'}</p>
                                                <div className="flex gap-1 mt-2 border-t border-slate-100 pt-1">
                                                    {post.platforms.includes('facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
                                                    {post.platforms.includes('instagram') && <Instagram className="w-3 h-3 text-pink-600" />}
                                                    {post.platforms.includes('tiktok') && <Music className="w-3 h-3 text-slate-900" />}
                                                    {post.platforms.includes('threads') && <AtSign className="w-3 h-3 text-slate-900" />}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="mt-auto pt-2 opacity-0 group-hover/day:opacity-100 transition-opacity">
                                            <button 
                                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-bold flex items-center justify-center gap-1 bg-white hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Plus className="w-3 h-3" /> Programmer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                ) : (
                <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-50">
                    <div className="grid grid-cols-7 gap-2 min-w-[800px] mb-2">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                            <div key={d} className="text-center text-sm font-bold text-slate-500 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 min-w-[800px]">
                        {monthDays.map(day => {
                            const isToday = isSameDay(day, new Date())
                            const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                            const dayPosts = posts.filter(p => isSameDay(p.date, day) && (platformFilter === 'all' || p.platforms.includes(platformFilter)) && (statusFilter === 'all' || p.status === statusFilter)).sort((a, b) => a.time.localeCompare(b.time))
                            
                            return (
                                <div 
                                    key={day.toISOString()} 
                                    onClick={(e) => handleScheduleOnDay(day, e)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleImageDropOnDay(e, day)}
                                    className={`flex flex-col bg-white rounded-xl border ${isToday ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200'} ${!isCurrentMonth ? 'opacity-50 bg-slate-50/50' : ''} min-h-[100px] overflow-hidden group/day cursor-pointer hover:border-blue-300 transition-colors`}
                                >
                                    <div className={`px-2 py-1 text-right text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                                        {day.getDate()}
                                    </div>
                                    <div className="p-1 flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[80px]">
                                        {dayPosts.map(post => (
                                            <div 
                                                key={post.id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenModal(post.time, post);
                                                }}
                                                className="bg-blue-50 border border-blue-100 rounded px-1.5 py-1 cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                title={post.content || 'Image'}
                                            >
                                                <span className="text-[10px] font-bold text-blue-700">{post.time}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-blue-900 truncate">{post.content || 'Image'}</p>
                                                </div>
                                                <div className="shrink-0 scale-75 origin-right">
                                                    {getStatusIcon(post.status)}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="mt-auto opacity-0 group-hover/day:opacity-100 transition-opacity pb-1">
                                            <button 
                                                className="w-full py-1 border border-dashed border-slate-200 rounded text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1 bg-white hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Plus className="w-3 h-3" /> Ajouter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-20 shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                {editingPostId ? 'Modifier le post' : `Programmer le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(selectedDate)}`}
                            </h3>
                            <button onClick={() => !isLoading && setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" disabled={isLoading}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Form Column */}
                        <div className="p-4 space-y-4 md:w-1/2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Heure de publication</label>
                                <select
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
                                    disabled={isLoading}
                                >
                                    {timeSlots.map(time => (
                                        <option 
                                            key={time} 
                                            value={time} 
                                            disabled={!editingPostId && isPastTime(time)}
                                        >
                                            {time} {!editingPostId && isPastTime(time) ? '(Dépassé)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Plateformes</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            if (selectedPlatforms.length === 4) {
                                                setSelectedPlatforms([])
                                            } else {
                                                setSelectedPlatforms(['facebook', 'instagram', 'tiktok', 'threads'])
                                            }
                                        }}
                                        className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide flex items-center justify-center ${selectedPlatforms.length === 4 ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        All
                                    </button>
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
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Média</label>
                                {selectedMedia ? (
                                    <div className="relative border border-slate-200 rounded-xl p-2 flex items-start gap-3 bg-slate-50">
                                        <div className="w-16 h-16 relative rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-black">
                                            {isVideo(selectedMedia.url) ? (
                                                <video src={getImageUrl(selectedMedia.url)} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <Image src={getImageUrl(selectedMedia.url)} alt={selectedMedia.name} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{selectedMedia.name}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedMedia(null)}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            disabled={isLoading}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setShowAssetsGrid(!showAssetsGrid)}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                        disabled={isLoading}
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
                                                        className="aspect-square relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors group bg-black"
                                                    >
                                                        {isVideo(asset.url) ? (
                                                            <>
                                                                <video src={getImageUrl(asset.url)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" muted />
                                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                                    <div className="bg-white/90 rounded-full p-1 shadow-sm">
                                                                        <Music className="w-4 h-4 text-slate-800" />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <Image src={getImageUrl(asset.url)} alt={asset.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Preview Column */}
                        <div className="p-4 md:w-1/2 bg-slate-50/50 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <Smartphone className="w-5 h-5 text-slate-500" />
                                <h4 className="font-bold text-slate-700">Aperçu mobile</h4>
                            </div>
                            
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-[320px] mx-auto w-full">
                                {/* Header Mock */}
                                <div className="p-3 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                                    <div>
                                        <div className="h-3 w-20 bg-slate-200 rounded mb-1" />
                                        <div className="h-2 w-12 bg-slate-100 rounded" />
                                    </div>
                                </div>
                                {/* Content Mock */}
                                <div className="px-3 pb-2">
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap font-sans break-words">{newPostContent || 'Votre texte apparaîtra ici...'}</p>
                                </div>
                                {/* Media Mock */}
                                {selectedMedia && (
                                    <div className="aspect-square relative bg-black">
                                        {isVideo(selectedMedia.url) ? (
                                            <video src={getImageUrl(selectedMedia.url)} className="w-full h-full object-cover" />
                                        ) : (
                                            <Image src={getImageUrl(selectedMedia.url)} alt="Preview" fill className="object-cover" />
                                        )}
                                    </div>
                                )}
                                {/* Footer Mock */}
                                <div className="p-3 flex items-center gap-4 border-t border-slate-100">
                                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                                </div>
                            </div>
                        </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 z-20 shrink-0">
                            {editingPostId && (
                                <button 
                                    onClick={(e) => {
                                        handleDeletePost(editingPostId, e as any)
                                        setIsModalOpen(false)
                                    }}
                                    disabled={isLoading}
                                    className="px-4 py-2 font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 mr-auto"
                                >
                                    <X className="w-4 h-4" /> Supprimer
                                </button>
                            )}
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                                disabled={isLoading}
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleSavePost}
                                disabled={isLoading}
                                className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {editingPostId ? 'Sauvegarder' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
