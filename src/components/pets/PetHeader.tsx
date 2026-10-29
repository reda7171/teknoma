'use client'
import {Link} from '@/i18n/routing'
import {useLocale} from 'next-intl'
import {ShoppingBag, PawPrint} from 'lucide-react'
import {useCartStore} from '@/store/cart'
import {useEffect, useState} from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {getPetCopy} from '@/lib/pets'
export default function PetHeader() {
 const locale = useLocale(), c = getPetCopy(locale)
 const count = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0))
 const [mounted, setMounted] = useState(false)
 useEffect(() => setMounted(true), [])
 return <header className="border-b border-[#17351d]/10 bg-white">
  <div className="bg-[#17351d] px-4 py-2 text-center text-xs font-medium text-[#f7f0df]">{c.tag}</div>
  <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
   <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-[#17351d]" dir="ltr"><PawPrint className="h-8 w-8 text-[#a07738]"/>PetsUnivers<span className="text-[#c59a55]">.</span></Link>
   <div className="flex items-center gap-5"><LanguageSwitcher/><Link href="/cart" className="flex items-center gap-2 text-sm font-bold text-[#17351d]"><ShoppingBag className="h-5 w-5"/><span className="hidden sm:inline">{c.cart}</span><span className="rounded-full bg-[#f7f0df] px-2 py-0.5 text-xs">{mounted ? count : 0}</span></Link></div>
  </div>
  <nav aria-label={c.catalog} className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto whitespace-nowrap px-5 pb-4 text-sm font-semibold text-[#17351d]">
   <Link href="/products">{c.all}</Link><Link href="/products?category=Chats">{c.cats}</Link><Link href="/products?category=Chiens">{c.dogs}</Link><Link href="/products?category=Alimentation">{c.food}</Link><Link href="/products?category=Accessoires">{c.accessories}</Link><Link href="/products?category=Hygi%C3%A8ne%20et%20soins">{c.care}</Link><Link href="/services">{c.services}</Link><Link href="/contact">{c.contact}</Link>
  </nav>
 </header>
}
