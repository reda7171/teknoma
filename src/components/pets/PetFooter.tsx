import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { getLocale } from 'next-intl/server'
import { Mail, Truck, HeartHandshake, Package, Phone, MessageCircle, ShieldCheck, CreditCard, Banknote } from 'lucide-react'
import { getPetCopy } from '@/lib/pets'
import { getPetContent, PET_CONTACT_EMAIL, TEKNO_PHONE, TEKNO_WHATSAPP_URL } from '@/lib/pet-content'
import PetCookieSettings from './PetCookieSettings'

export default async function PetFooter() {
  const locale = await getLocale()
  const c = getPetCopy(locale)
  const t = getPetContent(locale)

  return (
    <footer className="bg-[#1A1C1F] text-white pt-14 pb-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Top Reassurance Strip (MicroMagma style) */}
        <div className="grid gap-6 border-b border-gray-800 pb-10 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl bg-gray-900/60 p-4 border border-gray-800/80">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#75C300]/15 text-[#75C300]">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">{c.delivery}</p>
              <p className="text-xs text-gray-400 mt-0.5">Livraison express 24/48h partout au Maroc</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-gray-900/60 p-4 border border-gray-800/80">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1976D2]/20 text-[#1976D2]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">100% Neuf & Garanti</p>
              <p className="text-xs text-gray-400 mt-0.5">Produits certifiés d'origine sous blister</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-gray-900/60 p-4 border border-gray-800/80">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#75C300]/15 text-[#75C300]">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Paiement à la livraison</p>
              <p className="text-xs text-gray-400 mt-0.5">Payez en espèces ou par carte à réception</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand info */}
          <div>
            <Link href="/" className="inline-block" dir="ltr">
              <Image
                src="/logo.png"
                alt="Tekno Store"
                width={160}
                height={50}
                className="h-11 w-auto object-contain brightness-110"
              />
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-6 text-gray-400">
              {c.footer || 'Votre référence e-commerce au Maroc pour smartphones, ordinateurs portables, Mac & accessoires tech au meilleur prix.'}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-xs">
              <a
                dir="ltr"
                href={'tel:' + TEKNO_PHONE.replace(/[\s-]/g, '')}
                className="inline-flex items-center gap-2 font-bold text-white hover:text-[#75C300] transition-colors"
              >
                <Phone className="h-4 w-4 text-[#75C300]" />
                {TEKNO_PHONE}
              </a>
              <a
                dir="ltr"
                href={TEKNO_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-[#75C300] hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp : {TEKNO_PHONE}
              </a>
              <a
                dir="ltr"
                href={'mailto:' + PET_CONTACT_EMAIL}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 text-gray-500" />
                {PET_CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Catégories</h2>
            <ul className="space-y-2.5 text-xs text-gray-400">
              {[
                { href: '/products?category=Smartphones', label: c.smartphones },
                { href: '/products?category=PC%20Portables', label: c.pc },
                { href: '/products?category=Mac%20%26%20Apple', label: c.mac },
                { href: '/products?category=Audio', label: c.care },
                { href: '/products?category=Accessoires', label: c.accessories },
                { href: '/products?category=Stockage', label: c.small }
              ].map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="hover:text-[#75C300] transition-colors">
                    {x.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful links */}
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Liens Utiles</h2>
            <ul className="space-y-2.5 text-xs text-gray-400">
              {[
                { href: '/services', label: c.services },
                { href: '/about', label: t.about },
                { href: '/faq', label: t.faq },
                { href: '/contact', label: c.contact }
              ].map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="hover:text-[#75C300] transition-colors">
                    {x.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Shipping */}
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Informations</h2>
            <ul className="space-y-2.5 text-xs text-gray-400">
              {[
                { href: '/shipping-policy', label: t.shipping },
                { href: '/returns', label: t.returns },
                { href: '/privacy', label: t.privacy },
                { href: '/terms', label: t.terms }
              ].map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="hover:text-[#75C300] transition-colors">
                    {x.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Shipping & Payment partners strip (MicroMagma inspired) */}
        <div className="border-t border-gray-800 pt-8 pb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400">
            {/* Delivery partners */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="font-semibold text-gray-300">Expédition :</span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">Amana Express</span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">Tawssil</span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">Cathedis</span>
            </div>

            {/* Payment methods */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="font-semibold text-gray-300">Paiement :</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#75C300]/20 px-2.5 py-1 text-[11px] font-bold text-[#75C300]">
                Cash on Delivery (COD)
              </span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">CMI</span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">Visa</span>
              <span className="rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">Mastercard</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-800 pt-6 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Tekno Store Maroc. Tous droits réservés.</p>
          <PetCookieSettings />
          <p dir="ltr" className="font-semibold text-[#75C300]">tekno.ma</p>
        </div>
      </div>
    </footer>
  )
}
