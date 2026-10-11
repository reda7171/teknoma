import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { CartProvider } from '@/components/cart-provider'

const outfit = localFont({
  src: '../../../../src/fonts/Outfit-VariableFont_wght.ttf',
  variable: '--font-sans',
  display: 'swap',
})

const tajawal = localFont({
  src: '../../../../src/fonts/Tajawal-Regular.ttf',
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riwaya.ma'),
  title: { default: 'Riwaya — Librairie premium au Maroc', template: '%s | Riwaya' },
  description: 'Une sélection exigeante de livres, livrée partout au Maroc.',
  robots: process.env.RIWAYA_MA_INDEXABLE === 'true' ? { index: true, follow: true } : { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${tajawal.variable}`}>
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  )
}
