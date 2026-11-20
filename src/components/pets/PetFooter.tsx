import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { getLocale } from 'next-intl/server'
import { ArrowUpRight, Mail, Truck, HeartHandshake, Package } from 'lucide-react'
import { getPetCopy } from '@/lib/pets'
import { getPetContent, PET_CONTACT_EMAIL } from '@/lib/pet-content'
import PetCookieSettings from './PetCookieSettings'

export default async function PetFooter() {
  const locale = await getLocale(), c = getPetCopy(locale), t = getPetContent(locale)
  return <footer className="pet-footer bg-[#17351d] px-5 pb-10 pt-10 text-[#f7f0df] sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-5 border-b border-white/15 pb-9 text-sm sm:grid-cols-3">{[{icon:Truck,title:c.delivery,text:t.shipping,href:'/shipping-policy'},{icon:Package,title:t.returns,text:t.readMore,href:'/returns'},{icon:HeartHandshake,title:c.help,text:c.contact,href:'/contact'}].map(({icon:Icon,title,text,href}) => <Link key={href} href={href} className="flex items-center gap-4 rounded-xl px-2 py-2"><Icon className="h-7 w-7 shrink-0 text-[#d8b87c]" /><span><span className="block font-semibold">{title}</span><span className="mt-1 block text-xs text-[#f7f0df]/65">{text} →</span></span></Link>)}</div>
      <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div><Link href="/" className="flex items-center gap-2" dir="ltr"><Image src="/logo.png" alt="Tekno Store" width={160} height={50} className="h-12 w-auto object-contain" /></Link><p className="mt-5 max-w-xs text-sm leading-7 text-[#f7f0df]/70">{c.footer}</p><a dir="ltr" href={'mailto:' + PET_CONTACT_EMAIL} className="mt-6 inline-flex max-w-full items-center gap-2 break-all text-sm text-[#e5c993]"><Mail className="h-4 w-4 shrink-0" />{PET_CONTACT_EMAIL}</a></div>
        <div><h2 className="mb-5 text-sm font-bold">{t.shop}</h2><ul className="space-y-3 text-sm text-[#f7f0df]/75">{[{href:'/products?category=Smartphones',label:c.smartphones},{href:'/products?category=PC%20Portables',label:c.pc},{href:'/products?category=Mac%20%26%20Apple',label:c.mac},{href:'/products?category=Audio',label:c.care},{href:'/products?category=Accessoires',label:c.accessories},{href:'/products?category=Stockage',label:c.small}].map(x => <li key={x.href}><Link href={x.href} className="hover:text-white hover:underline">{x.label}</Link></li>)}</ul></div>
        <div><h2 className="mb-5 text-sm font-bold">{t.useful}</h2><ul className="space-y-3 text-sm text-[#f7f0df]/75">{[{href:'/services',label:c.services},{href:'/about',label:t.about},{href:'/faq',label:t.faq},{href:'/contact',label:c.contact}].map(x => <li key={x.href}><Link href={x.href} className="hover:text-white hover:underline">{x.label}</Link></li>)}</ul></div>
        <div><h2 className="mb-5 text-sm font-bold">{t.legal}</h2><ul className="space-y-3 text-sm text-[#f7f0df]/75">{[{href:'/shipping-policy',label:t.shipping},{href:'/returns',label:t.returns},{href:'/privacy',label:t.privacy},{href:'/terms',label:t.terms}].map(x => <li key={x.href}><Link href={x.href} className="hover:text-white hover:underline">{x.label}</Link></li>)}</ul><Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#f7f0df]/25 px-4 py-2.5 text-xs font-bold">{c.contact}<ArrowUpRight className="h-3 w-3" /></Link></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-xs text-[#f7f0df]/65"><p>© {new Date().getFullYear()} Tekno Store. {c.rights}</p><PetCookieSettings/><p dir="ltr" className="text-sm font-semibold text-[#d8b87c]">Tekno Store Maroc</p></div>
    </div>
  </footer>
}
