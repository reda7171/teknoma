'use client'

import React from 'react'
import Script from 'next/script'
import { Instagram } from 'lucide-react'
import { useTranslations } from 'next-intl'
import DelayedScripts from '@/components/DelayedScripts'

export default function InstagramFeed() {
  const t = useTranslations('InstagramFeed')

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-rose-100 rounded-full">
            <Instagram className="w-4 h-4 text-pink-600" />
            <span className="text-[11px] font-black uppercase text-pink-600 tracking-[0.3em]">
              {t('Badge')}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight">
            {t('Title')}<span className="text-pink-500">.</span>
          </h2>
        </div>
        
        <div className="mt-8 w-full min-h-[400px]">
          {/* Elfsight Instagram Feed | Untitled Instagram Feed */}
          <DelayedScripts>
            <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
            <div className="elfsight-app-05b16c20-cef7-4121-bcb8-2483d502a22c" data-elfsight-app-lazy></div>
          </DelayedScripts>
        </div>
      </div>
    </section>
  )
}

