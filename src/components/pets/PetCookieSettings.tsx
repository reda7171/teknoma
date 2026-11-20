'use client'
import { useLocale } from 'next-intl'

export default function PetCookieSettings() {
  const locale=useLocale()
  return <button type="button" onClick={()=>window.dispatchEvent(new Event('petsunivers-open-consent'))} className="text-xs underline underline-offset-4">{locale==='ar'?'تفضيلات ملفات الارتباط':locale==='en'?'Cookie preferences':'Préférences cookies'}</button>
}
