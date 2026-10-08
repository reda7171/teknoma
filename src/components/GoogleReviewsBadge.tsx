'use client'

import { useLocale } from 'next-intl'

export default function GoogleReviewsBadge() {
  const locale = useLocale()

  const isAr = locale === 'ar'
  const isEn = locale === 'en'

  const title = isAr ? 'آراء العملاء' : isEn ? 'Reviews' : 'Avis clients'
  const action = isAr ? 'عرض على Google' : isEn ? 'View on Google' : 'Voir sur Google'
  const aria = isAr ? 'عرض تقييمات عملاء رواية على Google' : isEn ? 'View Riwaya customer reviews on Google' : 'Consulter les avis clients Riwaya sur Google'

  return (
    <a
      href="https://www.google.com/maps/place/Riwaya/@34.0151156,-6.8506771,17z/data=!3m1!4b1!4m6!3m5!1s0xda76d9be04b2cdb:0xb283e75db60f9d37!8m2!3d34.0151156!4d-6.8506771!16s%2Fg%2F11ywgnhfxt"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      className="hidden md:flex fixed left-3 bottom-3 z-50 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-lg transition-transform hover:-translate-y-0.5"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-black shadow-sm ring-1 ring-gray-100"
      >
        <span className="text-blue-600">G</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-bold">{title}</span>
        <span className="text-xs font-black text-blue-600">{action}</span>
      </span>
    </a>
  )
}
