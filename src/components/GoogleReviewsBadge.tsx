'use client'

import Script from 'next/script'

export default function GoogleReviewsBadge() {
  return (
    <>
      <div 
        id="___ratingbadge_0" 
        className="fixed left-0 z-[2147483647] bottom-[70px] md:bottom-0 pointer-events-none"
        style={{ 
          minHeight: '60px', 
          minWidth: '120px',
          width: '180px',
          height: '72px',
          // Forcer la réservation d'espace dès le début pour éviter CLS (score 0.182)
          contain: 'layout',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />
      <Script 
        id="merchantWidgetScript" 
        src="https://www.gstatic.com/shopping/merchant/merchantwidget.js" 
        strategy="lazyOnload" 
        onLoad={() => {
          if (typeof window !== 'undefined' && (window as any).merchantwidget) {
            (window as any).merchantwidget.start({
              merchant_id: 5826844744,
              position: 'BOTTOM_LEFT',
              region: 'MA'
            });
            const interval = setInterval(() => {
              // Google génère un ID aléatoire ou utilise merchantwidgetiframe
              const iframe = document.querySelector('iframe#merchantwidgetiframe, iframe[src*="merchantverse"], #___ratingbadge_0 iframe');
              if (iframe) {
                if (!iframe.hasAttribute('title')) {
                  iframe.setAttribute('title', 'Avis clients Google');
                }
                // Activer les clics une fois chargé
                const badge = document.getElementById('___ratingbadge_0');
                if (badge) {
                  badge.style.pointerEvents = 'auto';
                }
                clearInterval(interval);
              }
            }, 100);

            // Cleanup de sécurité après 10s
            setTimeout(() => clearInterval(interval), 10000);
          }
        }} 
      />
    </>
  )
}
