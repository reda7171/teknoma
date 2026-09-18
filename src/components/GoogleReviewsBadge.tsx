'use client'

import Script from 'next/script'

export default function GoogleReviewsBadge() {
  return (
    <>
      <div 
        id="___ratingbadge_0" 
        style={{ minHeight: '60px', minWidth: '120px', position: 'fixed', bottom: '0px', left: '0px', zIndex: 2147483647, pointerEvents: 'none' }}
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
            setTimeout(() => {
              // Google génère un ID aléatoire (ex: I0_12345), on le cible via son parent ou son src
              const iframe = document.querySelector('iframe[src*="merchantverse"]') || document.querySelector('#___ratingbadge_0 iframe');
              if (iframe && !iframe.hasAttribute('title')) {
                iframe.setAttribute('title', 'Avis clients Google');
              }
              // Activer les clics une fois chargé
              const badge = document.getElementById('___ratingbadge_0');
              if (badge) {
                badge.style.pointerEvents = 'auto';
              }
            }, 2000);
          }
        }} 
      />
    </>
  )
}
