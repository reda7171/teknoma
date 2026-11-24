import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { getLocale } from 'next-intl/server'
import { Mail, Truck, HeartHandshake, Package, Phone, MessageCircle, ShieldCheck, CreditCard, Banknote, Instagram, Facebook, Youtube, Linkedin } from 'lucide-react'
import { getPetCopy } from '@/lib/pets'
import { getPetContent, PET_CONTACT_EMAIL, TEKNO_PHONE, TEKNO_WHATSAPP_URL } from '@/lib/pet-content'
import { getSetting } from '@/lib/actions/site-settings'
import PetCookieSettings from './PetCookieSettings'
import PetBackToTop from './PetBackToTop'
import PetNewsletter from './PetNewsletter'
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.83-4.49V8.62a8.28 8.28 0 0 0 4.94 1.62V6.79a4.84 4.84 0 0 1-1-.1z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default async function PetFooter() {
  const locale = await getLocale()
  const c = getPetCopy(locale)
  const t = getPetContent(locale)

  const [
    instagram,
    facebook,
    tiktok,
    youtube,
    twitter,
    linkedin,
    whatsappChannel
  ] = await Promise.all([
    getSetting('social_instagram'),
    getSetting('social_facebook'),
    getSetting('social_tiktok'),
    getSetting('social_youtube'),
    getSetting('social_twitter'),
    getSetting('social_linkedin'),
    getSetting('social_whatsapp_channel')
  ])

  const socials = [
    { label: 'Instagram', href: instagram || 'https://instagram.com', icon: Instagram },
    { label: 'Facebook', href: facebook || 'https://facebook.com', icon: Facebook },
    { label: 'TikTok', href: tiktok || 'https://tiktok.com', icon: TikTokIcon },
    { label: 'YouTube', href: youtube || 'https://youtube.com', icon: Youtube },
    { label: 'X', href: twitter || 'https://x.com', icon: XIcon },
    { label: 'LinkedIn', href: linkedin || 'https://linkedin.com', icon: Linkedin },
  ]

  return (
    <footer className="bg-[#1A1C1F] text-white pt-14 pb-10 relative">
      <GoogleReviewsBadge />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Top Reassurance Strip & Back to top */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-b border-gray-800 pb-10">
          <div className="grid gap-6 flex-1 sm:grid-cols-3">
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

          <div className="shrink-0 flex justify-end">
            <PetBackToTop />
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
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

            {/* Social media icons */}
            <div className="mt-6 pt-5 border-t border-gray-800/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Suivez-nous
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {socials.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Tekno Store sur ${label}`}
                    title={label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-[#75C300] hover:bg-[#75C300]/10 transition-all duration-200"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
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
                { href: '/tracking', label: locale === 'ar' ? 'تتبع طلبي' : locale === 'en' ? 'Track order' : 'Suivi de commande' },
                { href: '/blog', label: locale === 'ar' ? 'المدونة والجديد' : locale === 'en' ? 'Blog & News' : 'Actualités & Blog' },
                { href: '/devenir-vendeur', label: locale === 'ar' ? 'كن شريكاً معنا' : locale === 'en' ? 'Become a partner' : 'Devenir Partenaire' },
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

          {/* Newsletter & Push alerts */}
          <div className="sm:col-span-2 lg:col-span-1">
            <PetNewsletter />
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
          <div className="hidden sm:flex items-center gap-3">
            {socials.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="text-gray-500 hover:text-[#75C300] transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
          <PetCookieSettings />
          <p dir="ltr" className="font-semibold text-[#75C300]">tekno.ma</p>
        </div>
      </div>
    </footer>
  )
}
