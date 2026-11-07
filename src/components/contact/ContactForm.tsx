'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { sendContactMessage } from '@/lib/actions/contact'
import { useTranslations } from 'next-intl'

export default function ContactForm() {
    const t = useTranslations('ContactPage')
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [honeypot, setHoneypot] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus(null)
        setIsSubmitting(true)

        try {
            const res = await sendContactMessage({
                fullName,
                email,
                subject,
                message,
                honeypot,
            })

            if (res.success) {
                setStatus({
                    type: 'success',
                    message: t('MessageSentSuccess'),
                })
                setFullName('')
                setEmail('')
                setSubject('')
                setMessage('')
            } else {
                setStatus({
                    type: 'error',
                    message: res.error || t('MessageSentError'),
                })
            }
        } catch {
            setStatus({
                type: 'error',
                message: t('MessageSentError'),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 mt-4 md:mt-0">
            {/* Piège anti-spam invisible pour les utilisateurs légitimes */}
            <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden opacity-0 h-0 w-0 absolute pointer-events-none"
                aria-hidden="true"
            />
            {status && (
                <div
                    className={`p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 text-xs sm:text-sm font-bold ${
                        status.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    {status.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                    )}
                    <span>{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mx-4">
                        {t('FullName')}
                    </label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all text-gray-900"
                        placeholder={t('YourName')}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mx-4">
                        {t('EmailLabel')}
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all text-gray-900"
                        placeholder={t('EmailPlaceholder')}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mx-4">
                    {t('Subject')}
                </label>
                <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-8 py-5 bg-gray-50 border-none rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all text-gray-900"
                    placeholder={t('SubjectPlaceholder')}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mx-4">
                    {t('MessageLabel')}
                </label>
                <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-8 py-6 bg-gray-50 border-none rounded-[2.5rem] text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all resize-none text-gray-900"
                    placeholder={t('MessagePlaceholder')}
                ></textarea>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-all flex items-center justify-center gap-4 group"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('SendMessage')}...</span>
                    </>
                ) : (
                    <>
                        <span>{t('SendMessage')}</span>
                        <Send className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform rtl:rotate-180" />
                    </>
                )}
            </button>
        </form>
    )
}

