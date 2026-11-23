'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { Cookie, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'

const copy = {
  fr:{title:'Vos préférences de navigation',text:'Le panier et la session utilisent des données nécessaires. Vous pouvez accepter ou refuser les outils de mesure et de marketing optionnels.',accept:'Accepter',decline:'Refuser les optionnels',privacy:'Confidentialité',close:'Fermer et refuser les optionnels'},
  en:{title:'Your browsing preferences',text:'The basket and session use necessary data. You can accept or decline optional analytics and marketing tools.',accept:'Accept',decline:'Decline optional tools',privacy:'Privacy',close:'Close and decline optional tools'},
  ar:{title:'تفضيلات التصفح',text:'تستخدم السلة والجلسة بيانات ضرورية. يمكنك قبول أو رفض أدوات التحليل والتسويق الاختيارية.',accept:'قبول',decline:'رفض الأدوات الاختيارية',privacy:'الخصوصية',close:'إغلاق ورفض الأدوات الاختيارية'},
}

export default function CookieConsent() {
  const locale=useLocale(),t=copy[locale as keyof typeof copy]||copy.fr,pathname=usePathname()
  const isAdmin=pathname?.split('/').includes('admin')
  const [visible,setVisible]=useState(false)
  useEffect(()=>{
    const show=()=>setVisible(!isAdmin)
    setVisible(!localStorage.getItem('cookie-consent')&&!isAdmin)
    window.addEventListener('tekno-open-consent',show)
    return()=>window.removeEventListener('tekno-open-consent',show)
  },[isAdmin])
  function choose(value:'accepted'|'declined') {
    localStorage.setItem('cookie-consent',value)
    window.dispatchEvent(new Event('tekno-consent-change'))
    setVisible(false)
  }
  if(!visible)return null
  return <section role="region" aria-label={t.title} data-cookie-consent className="pets-store fixed bottom-4 end-4 z-[200] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#17351d]/15 bg-[#fffdf8] p-5 text-[#17351d] shadow-xl">
    <div className="flex items-center gap-3"><Cookie className="h-5 w-5 text-[#96703a]"/><h2 className="flex-1 text-sm font-semibold">{t.title}</h2><button type="button" onClick={()=>choose('declined')} aria-label={t.close} className="rounded-lg p-1.5"><X className="h-4 w-4"/></button></div>
    <p className="mt-3 text-xs leading-6 text-[#56634e]">{t.text} <Link href="/privacy" className="font-semibold underline underline-offset-2">{t.privacy}</Link></p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>choose('accepted')} className="flex-1 rounded-full bg-[#17351d] px-4 py-3 text-xs font-semibold text-white">{t.accept}</button><button type="button" onClick={()=>choose('declined')} className="flex-1 rounded-full border border-[#17351d]/25 px-4 py-3 text-xs font-semibold">{t.decline}</button></div>
  </section>
}
