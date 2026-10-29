'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import Image from 'next/image'

interface AudioTestimonialProps {
    testimonial: {
        id: string
        customerName: string
        audioUrl: string
        avatarUrl?: string | null
        duration?: number | null
        createdAt: Date
    }
}

export default function AudioTestimonial({ testimonial }: AudioTestimonialProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState('0:00')
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        audioRef.current = new Audio(testimonial.audioUrl)
        audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
        audioRef.current.addEventListener('ended', handleEnded)

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
                audioRef.current.removeEventListener('ended', handleEnded)
                audioRef.current.pause()
            }
        }
    }, [testimonial.audioUrl])

    useEffect(() => {
        const handleOtherPlay = (e: CustomEventInit) => {
            if (e.detail !== testimonial.id && isPlaying && audioRef.current) {
                audioRef.current.pause()
                setIsPlaying(false)
            }
        }
        window.addEventListener('audio-play', handleOtherPlay as EventListener)
        return () => window.removeEventListener('audio-play', handleOtherPlay as EventListener)
    }, [testimonial.id, isPlaying])

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime
            const duration = audioRef.current.duration || 1
            setProgress((current / duration) * 100)

            const minutes = Math.floor(current / 60)
            const seconds = Math.floor(current % 60)
            setCurrentTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime('0:00')
    }

    const togglePlay = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            window.dispatchEvent(new CustomEvent('audio-play', { detail: testimonial.id }))
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex gap-3 max-w-sm w-full font-sans">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mt-auto relative shadow-sm">
                {testimonial.avatarUrl ? (
                    (() => {
                        const normalizedImg = testimonial.avatarUrl?.trim() || '';
                        const finalImage = normalizedImg.startsWith('http') || normalizedImg.startsWith('data:')
                            ? normalizedImg
                            : normalizedImg.startsWith('/')
                                ? normalizedImg
                                : '/' + normalizedImg;
                        return <Image
                            src={finalImage}
                            alt={testimonial.customerName}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized={process.env.NODE_ENV === 'development'}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('petsunivers.ma') && target.src.includes('/uploads/')) {
                                    target.src = `https://petsunivers.ma${new URL(target.src).pathname}`;
                                    target.srcset = '';
                                }
                            }}
                        />
                    })()
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {testimonial.customerName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Bubble WhatsApp */}
            <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1 ml-1 font-medium">{testimonial.customerName}</span>
                <div className="bg-[#E7FFDB] rounded-2xl rounded-bl-none p-2.5 shadow-sm relative flex items-center gap-3">
                    {/* Tail */}
                    <div className="absolute -left-2 bottom-0 w-4 h-4 bg-[#E7FFDB]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>

                    {/* Play Button */}
                    <button
                        onClick={togglePlay}
                        className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm hover:scale-105 hover:shadow-md transition-all active:scale-95"
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>

                    {/* Waveform / Progress */}
                    <div className="flex-1 min-w-[140px] flex flex-col justify-center">
                        <div className="w-full flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-emerald-200/50 rounded-full overflow-hidden relative">
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-full transition-all duration-100 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Animated Equalizer when playing */}
                            {isPlaying && (
                                <div className="flex items-end gap-[2px] h-3 ml-1">
                                    <div className="w-[3px] bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite] h-full" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-[3px] bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite] h-2/3" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-[3px] bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite] h-full" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[10px] text-emerald-800/60 font-medium font-mono">{currentTime}</span>
                            <span className="text-[9px] text-emerald-800/40">{formatTime(testimonial.createdAt)}</span>
                        </div>
                    </div>

                    {/* Checkmarks */}
                    <div className="absolute bottom-1.5 right-2 flex">
                        <svg viewBox="0 0 16 15" width="16" height="15" className="fill-[#53bdeb]">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}
