'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import { tryAutoReloadOnChunkError } from '@/lib/chunk-reload'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Rechargement automatique unique si un chunk a expiré après déploiement
    tryAutoReloadOnChunkError(error)
  }, [error])
  return (
    <html lang="fr" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erreur | Tekno Store</title>
        <meta name="description" content="Une erreur inattendue s'est produite sur Tekno Store. Veuillez rafraîchir la page." />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#faf9f6', color: '#111' }}>
        <main role="main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '24px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <AlertCircle style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.03em' }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px', maxWidth: '440px', margin: '0 0 32px 0', lineHeight: 1.5 }}>
            Le service rencontre une interruption momentanée. Vous pouvez rafraîchir la page ou revenir à l'accueil.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw style={{ width: '16px', height: '16px' }} />
              Réessayer
            </button>
            <a
              href="/fr"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                fontWeight: 800,
                fontSize: '14px',
                textDecoration: 'none'
              }}
            >
              <Home style={{ width: '16px', height: '16px' }} />
              Retour à l'accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
