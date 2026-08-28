'use client'

import Script from 'next/script'

export default function GoogleReviewsBadge() {
  return (
    <Script 
      id="merchantWidgetScript" 
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js" 
      strategy="afterInteractive" 
      onLoad={() => {
        if (typeof window !== 'undefined' && (window as any).merchantwidget) {
          (window as any).merchantwidget.start({
            merchant_id: 5826844744,
            position: 'BOTTOM_LEFT',
            region: 'MA'
          });
          setTimeout(() => {
            const iframe = document.getElementById('merchantwidgetiframe');
            if (iframe && !iframe.hasAttribute('title')) {
              iframe.setAttribute('title', 'Avis clients Google');
            }
          }, 2000);
        }
      }} 
    />
  )
}
