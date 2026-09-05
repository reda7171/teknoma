'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { Gift, X, Copy, Check, Sparkles } from 'lucide-react'

export default function WelcomeOfferPopup() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (searchParams.get('welcome') === 'true') {
            // Slight delay for animation effect
            const timer = setTimeout(() => setIsOpen(true), 500)
            return () => clearTimeout(timer)
        }
    }, [searchParams])

    const handleClose = () => {
        setIsOpen(false)
        // Remove 'welcome=true' from URL without triggering a full page reload
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.delete('welcome')
        const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '')
        window.history.replaceState(null, '', newUrl)
    }

    const copyCode = () => {
        navigator.clipboard.writeText('WELCOME10')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden text-center">
                
                {/* Decorative background circle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative z-10 flex flex-col items-center pt-4">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-200 to-amber-400 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-amber-200/50">
                        <Gift className="w-10 h-10 text-amber-900" />
                    </div>

                    <h2 className="text-3xl font-black tracking-tighter text-black mb-2 flex items-center gap-2 justify-center">
                        مرحباً بك <Sparkles className="w-6 h-6 text-amber-500" />
                    </h2>
                    
                    <p className="text-gray-500 font-bold text-sm mb-6 max-w-[250px] mx-auto leading-relaxed">
                        شكراً لانضمامك إلى مجتمعنا. إليك هدية ترحيبية بقيمة <span className="text-black font-black">10 دراهم</span> خصم على طلبك الأول!
                    </p>

                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-amber-300 transition-colors">
                        <span className="text-2xl font-black text-black tracking-widest font-mono">
                            WELCOME10
                        </span>
                        <button 
                            onClick={copyCode}
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                                copied 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                        >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    {copied && <p className="text-green-600 font-bold text-xs mt-3 animate-in fade-in">تم نسخ الكود بنجاح!</p>}

                    <button 
                        onClick={handleClose}
                        className="mt-8 w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-black py-4 rounded-2xl transition-colors"
                    >
                        تصفح المتجر
                    </button>
                </div>
            </div>
        </div>
    )
}