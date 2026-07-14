'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Gift, Sparkles, AlertCircle, Share2, ArrowDown } from 'lucide-react'
import confetti from 'canvas-confetti'

const PRIZES = [
    { label: "Livre Gratuit", color: "#FF3366", textColor: "white", isWin: true },   // Vibrant Red/Pink
    { label: "Oups, Perdu!", color: "#20B2AA", textColor: "white", isWin: false },     // Light Sea Green
    { label: "Marque-page", color: "#FF9933", textColor: "white", isWin: true },     // Orange
    { label: "Presque...", color: "#00C9FF", textColor: "white", isWin: false },   // Cyan
    { label: "Code -10%", color: "#FFD700", textColor: "black", isWin: true },       // Gold
    { label: "Retentez", color: "#1E90FF", textColor: "white", isWin: false },     // Blue
]

export default function RoulettePopup() {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isSpinning, setIsSpinning] = useState(false)
    const [hasSpun, setHasSpun] = useState(false)
    const [wonPrize, setWonPrize] = useState<string | null>(null)
    const [rotation, setRotation] = useState(0)
    const [attemptsLeft, setAttemptsLeft] = useState(3)
    const [showLostMessage, setShowLostMessage] = useState(false)
    const [gameOver, setGameOver] = useState(false)
    
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        setMounted(true)
        
        const savedPrize = localStorage.getItem('roulette_prize')
        const popupClosed = localStorage.getItem('roulette_closed')
        const savedAttempts = localStorage.getItem('roulette_attempts')
        
        if (savedAttempts !== null) {
            setAttemptsLeft(parseInt(savedAttempts, 10))
        }

        if (savedPrize || popupClosed === 'true' || savedAttempts === '0') {
            return
        }

        timerRef.current = setTimeout(() => {
            setIsOpen(true)
        }, 2000)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    const closePopup = () => {
        setIsOpen(false)
        if (!hasSpun && attemptsLeft > 0) {
            localStorage.setItem('roulette_closed', 'true')
        }
    }

    const spinWheel = () => {
        if (isSpinning || hasSpun || attemptsLeft <= 0) return

        setIsSpinning(true)
        setShowLostMessage(false)
        
        // 3% chance de gagner
        const winChance = 0.03
        const isWin = Math.random() <= winChance
        
        let winningIndex
        if (isWin) {
            const wins = [0, 2, 4]
            winningIndex = wins[Math.floor(Math.random() * wins.length)]
        } else {
            const losses = [1, 3, 5]
            winningIndex = losses[Math.floor(Math.random() * losses.length)]
        }
        
        const prize = PRIZES[winningIndex]
        
        const segmentAngle = 360 / PRIZES.length
        const currentCenter = (winningIndex * segmentAngle) + (segmentAngle / 2)
        
        const currentSpins = Math.floor(rotation / 360)
        const baseTarget = (360 * (currentSpins + 6)) + (360 - currentCenter) // +6 pour plus de tours

        setRotation(baseTarget)

        setTimeout(() => {
            setIsSpinning(false)
            
            const newAttempts = attemptsLeft - 1
            setAttemptsLeft(newAttempts)
            localStorage.setItem('roulette_attempts', newAttempts.toString())

            if (prize.isWin) {
                setHasSpun(true)
                setWonPrize(prize.label)
                localStorage.setItem('roulette_prize', prize.label)
                
                confetti({
                    particleCount: 200,
                    spread: 90,
                    origin: { y: 0.5 },
                    colors: ['#FF3366', '#00C9FF', '#FFD700', '#FF9933'],
                    disableForReducedMotion: true
                })
            } else {
                setShowLostMessage(true)
                if (newAttempts <= 0) {
                    setGameOver(true)
                    localStorage.setItem('roulette_closed', 'true')
                    setTimeout(() => {
                        setIsOpen(false)
                    }, 4000)
                }
            }
        }, 5500)
    }

    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://riwaya.store'
    const shareText = `J'ai gagné un ${wonPrize} sur Riwaya.store ! Tentez votre chance à votre tour 🎁📚`
    
    const handleShareFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank')
    }

    const handleShareWhatsApp = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')
    }

    if (!mounted || !isOpen) return null

    const gradientStops = PRIZES.map((prize, i) => {
        const start = i * (360 / PRIZES.length)
        const end = (i + 1) * (360 / PRIZES.length)
        return `${prize.color} ${start}deg ${end}deg`
    }).join(', ')

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            {/* Lueur d'arrière-plan */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/30 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative w-full max-w-md bg-[#0B1120]/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,193,255,0.3)] animate-zoom-in">
                
                {/* Decorative gradients inside popup */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

                {!isSpinning && (
                    <button 
                        onClick={closePopup}
                        className="absolute top-5 right-5 z-20 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="p-8 flex flex-col items-center text-center relative z-10">
                    {!hasSpun && !gameOver ? (
                        <div className="animate-fade-in">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
                                <Gift className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
                                Tentez votre chance !
                            </h2>
                            <p className="text-gray-400 text-sm mb-6 font-medium leading-relaxed">
                                Vous avez <strong className="text-cyan-400">{attemptsLeft}</strong> {attemptsLeft > 1 ? 'essais' : 'essai'}. Tournez la roue pour gagner un cadeau exceptionnel !
                            </p>
                            
                            {showLostMessage && attemptsLeft > 0 && (
                                <div className="text-pink-400 text-sm font-bold mb-4 bg-pink-500/10 border border-pink-500/20 py-2 px-4 rounded-xl animate-bounce">
                                    Oh non, c'est perdu ! Il vous reste {attemptsLeft} {attemptsLeft > 1 ? 'essais' : 'essai'}.
                                </div>
                            )}
                        </div>
                    ) : gameOver ? (
                        <div className="animate-fade-in">
                            <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gray-600">
                                <AlertCircle className="w-7 h-7 text-gray-300" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
                                Dommage...
                            </h2>
                            <p className="text-gray-400 text-sm font-medium mb-6">
                                Vous avez épuisé vos 3 tentatives. Plus de chance la prochaine fois !
                            </p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30 animate-pulse">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                                BINGO !
                            </h2>
                            <p className="text-lg text-gray-300 font-medium mb-8">
                                Vous avez gagné : 
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase block mt-2 text-3xl font-black drop-shadow-sm">
                                    {wonPrize}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* La Roue (Toujours visible mais l'opacité peut changer si on veut) */}
                    <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto mb-8 drop-shadow-2xl">
                        {/* Indicateur central custom */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                            <div className="w-10 h-12 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-[#0B1120] relative z-10">
                                    <ArrowDown className="w-5 h-5 text-[#0B1120]" />
                                </div>
                                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-white -mt-2 relative z-0"></div>
                            </div>
                        </div>
                        
                        {/* Conteneur de la roue avec bordure premium */}
                        <div className="w-full h-full rounded-full border-[6px] sm:border-8 border-[#1E293B] shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[#0F172A] p-1">
                            <div 
                                className="w-full h-full rounded-full relative overflow-hidden shadow-inner"
                                style={{
                                    background: `conic-gradient(${gradientStops})`,
                                    transform: `rotate(${rotation}deg)`,
                                    transition: isSpinning ? 'transform 5.5s cubic-bezier(0.15, 0.85, 0.15, 1)' : 'none'
                                }}
                            >
                                {PRIZES.map((prize, i) => {
                                    const angle = i * (360 / PRIZES.length) + (360 / PRIZES.length) / 2
                                    return (
                                        <div 
                                            key={i}
                                            className="absolute w-full h-full flex items-start justify-center pt-5 sm:pt-6"
                                            style={{
                                                transform: `rotate(${angle}deg)`,
                                                transformOrigin: '50% 50%',
                                            }}
                                        >
                                            <span 
                                                className="text-[10px] sm:text-xs font-black uppercase tracking-wider block drop-shadow-md"
                                                style={{ color: prize.textColor, transform: 'rotate(0deg)', maxWidth: '50px', textAlign: 'center', lineHeight: '1.2' }}
                                            >
                                                {prize.label}
                                            </span>
                                        </div>
                                    )
                                })}
                                
                                {/* Centre de la roue */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-b from-gray-700 to-gray-900 rounded-full border-2 border-gray-600 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center">
                                    <div className="w-3 h-3 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full shadow-inner" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {!hasSpun && !gameOver ? (
                        <button
                            onClick={spinWheel}
                            disabled={isSpinning}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/30"
                        >
                            {isSpinning ? 'La roue tourne...' : (attemptsLeft < 3 && showLostMessage ? 'Réessayer' : 'Tourner la roue')}
                        </button>
                    ) : hasSpun ? (
                        <div className="w-full space-y-4 animate-fade-in-up">
                            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-xs font-bold text-left flex gap-4 shadow-inner">
                                <AlertCircle className="w-6 h-6 shrink-0 text-green-500" />
                                <div>
                                    <p className="text-sm text-green-300">Cadeau enregistré !</p>
                                    <p className="font-medium mt-1 text-green-400/80">Ajoutez 4 livres à votre panier pour débloquer votre cadeau lors de la validation.</p>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-3">Partagez votre chance</p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleShareWhatsApp}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 py-3.5 rounded-xl font-bold text-sm hover:bg-[#25D366] hover:text-white transition-all duration-300"
                                    >
                                        <Share2 className="w-4 h-4" /> WhatsApp
                                    </button>
                                    <button 
                                        onClick={handleShareFacebook}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 py-3.5 rounded-xl font-bold text-sm hover:bg-[#1877F2] hover:text-white transition-all duration-300"
                                    >
                                        <Share2 className="w-4 h-4" /> Facebook
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
