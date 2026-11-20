'use client'

import { useState } from 'react'
import { Mail, ArrowUpRight } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetContactForm({ locale, email, subject = '' }: { locale: string; email: string; subject?: string }) {
  const t = getPetContent(locale)
  const [prepared, setPrepared] = useState(false)
  return <form className="rounded-[2rem] border border-[#17351d]/10 bg-white p-6 sm:p-9" onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = [String(data.get('message') || ''), '', t.name + ': ' + data.get('name'), t.email + ': ' + data.get('email'), ...(data.get('order') ? [t.order + ': ' + data.get('order')] : [])].join('\n')
    window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('PetsUnivers — ' + data.get('topic')) + '&body=' + encodeURIComponent(body)
    setPrepared(true)
  }}>
    <h2 className="font-serif text-2xl sm:text-3xl">{t.formTitle}</h2>
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className="pet-field">{t.name}<input name="name" autoComplete="name" required maxLength={120} /></label>
      <label className="pet-field">{t.email}<input name="email" type="email" autoComplete="email" dir="ltr" required maxLength={200} /></label>
      <label className="pet-field sm:col-span-2">{t.topic}<select name="topic" defaultValue={subject || t.topics[0]}>{subject && !t.topics.includes(subject) && <option>{subject}</option>}{t.topics.map(topic => <option key={topic}>{topic}</option>)}</select></label>
      <label className="pet-field sm:col-span-2">{t.order}<input name="order" maxLength={100} /></label>
      <label className="pet-field sm:col-span-2">{t.message}<textarea name="message" rows={5} required minLength={10} maxLength={5000} placeholder={t.messagePlaceholder} /></label>
    </div>
    <p className="mt-5 text-xs leading-6 text-[#56634e]">{t.formNote}</p>
    <button type="submit" className="pet-button mt-6 w-full sm:w-auto"><Mail className="h-4 w-4" />{t.submit}<ArrowUpRight className="h-4 w-4" /></button>
    {prepared && <p role="status" className="mt-5 text-sm leading-7 text-[#56634e]">{t.formNote} <a className="font-semibold underline" href={'mailto:' + email}>{email}</a></p>}
  </form>
}
