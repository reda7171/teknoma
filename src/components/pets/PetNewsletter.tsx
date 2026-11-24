'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { CheckCircle, Mail, Loader2, Send } from 'lucide-react'
import PushSubscribeButton from '@/components/PushSubscribeButton'

export default function PetNewsletter() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const isEn = locale === 'en'

  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const title = isAr ? 'النشرة البريدية' : isEn ? 'Newsletter' : 'Newsletter & Alertes'
  const text = isAr
    ? 'اشترك ليصلك جديد العروض والتخفيضات الحصرية على الأجهزة.'
    : isEn
    ? 'Subscribe to get exclusive tech deals and discount alerts.'
    : 'Abonnez-vous pour recevoir les offres exclusives et alertes promo.'
  const placeholder = isAr ? 'بريدك الإلكتروني...' : isEn ? 'Your email address...' : 'Votre adresse e-mail...'
  const submitText = isAr ? 'اشتراك' : isEn ? 'Join' : 'S\'inscrire'
  const successText = isAr
    ? 'شكراً لك! تم تسجيل بريدك الإلكتروني بنجاح.'
    : isEn
    ? 'Thank you! You are now subscribed.'
    : 'Merci ! Vous recevrez nos meilleures offres tech.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setSubscribed(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erreur lors de l\'inscription.')
      }
    } catch {
      setError('Impossible de s\'inscrire pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#75C300]/15 text-[#75C300]">
          <Mail className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        {text}
      </p>

      {subscribed ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#75C300]/10 border border-[#75C300]/30 px-3.5 py-3 text-xs font-bold text-[#75C300]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successText}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#75C300] focus:ring-1 focus:ring-[#75C300] transition-all"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#75C300] px-4 py-2.5 text-xs font-bold text-[#1A1C1F] hover:bg-[#68ad00] active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{submitText}</span>
                </>
              )}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
        </form>
      )}

      {/* Push Notifications Opt-in */}
      <div className="mt-4 pt-4 border-t border-gray-800/80 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-gray-400">
          {isAr ? 'تفعيل تنبيهات المتصفح' : isEn ? 'Web push alerts' : 'Alertes bons plans'}
        </span>
        <PushSubscribeButton />
      </div>
    </div>
  )
}
