'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const t = useTranslations('PWAInstallPrompt')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Capturer l'événement beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Afficher la bannière après 30s si pas déjà refusé
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 30000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Enregistrement du Service Worker (production uniquement)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW enregistré:', reg.scope))
        .catch((err) => console.error('SW erreur:', err))
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (isInstalled || !showBanner || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl shadow-black/20 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-black text-sm">{t('title')}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
              {t('description')}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all"
              >
                <Download className="w-3 h-3" />
                {t('install')}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
              >
                {t('later')}
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 text-gray-300 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
