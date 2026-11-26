'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RotateCcw, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { tryAutoReloadOnChunkError } from '@/lib/chunk-reload'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isReloading, setIsReloading] = useState(false)

  useEffect(() => {
    // Rechargement automatique unique si les chunks ont changé après déploiement
    if (tryAutoReloadOnChunkError(error)) {
      setIsReloading(true)
    }
  }, [error])

  if (isReloading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-black mb-4" />
        <p className="text-sm font-bold text-gray-600">Mise à jour de la page en cours…</p>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-black mb-3 tracking-tight">
        Une erreur est survenue
      </h1>
      <p className="text-gray-500 font-medium max-w-md mb-8 leading-relaxed">
        Nous n'avons pas pu charger cette page correctement. Veuillez réessayer ou retourner à l'accueil.
      </p>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-bold text-sm rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Réessayer</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 text-black font-bold text-sm rounded-full hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Accueil</span>
        </Link>
      </div>
    </div>
  )
}
