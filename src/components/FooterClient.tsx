'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { BookOpen, Instagram, Linkedin, Facebook, Twitter, ArrowUp, Youtube, AtSign, CheckCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl';
import Script from 'next/script'
import Image from 'next/image'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge'

interface FooterProps {
    features?: {
        seller?: boolean
        exchange?: boolean
        usb?: boolean
        kids?: boolean
        readingList?: boolean
    }
    siteLogo?: string | null
    socials?: {
        instagram?: string | null
        facebook?: string | null
        linkedin?: string | null
        twitter?: string | null
        youtube?: string | null
        threads?: string | null
        pinterest?: string | null
    }
    paymentSettings?: {
        stripe?: boolean
        paypal?: boolean
        cmi?: boolean
        cod?: boolean
        bank?: boolean
    }
    developer?: {
        name: string
        link: string
    }
}

const PinterestIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.63 7.85 6.35 9.31-.09-.79-.17-2.01.03-2.87.19-.83 1.22-5.18 1.22-5.18s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.88 0 1.3.66 1.3 1.45 0 .89-.57 2.22-.86 3.45-.25 1.04.52 1.88 1.54 1.88 1.85 0 3.27-1.95 3.27-4.77 0-2.49-1.79-4.23-4.35-4.23-2.98 0-4.73 2.24-4.73 4.54 0 .89.34 1.85.77 2.37.08.1.1.19.07.31l-.25 1.05c-.04.16-.14.2-.31.12-1.16-.54-1.89-2.25-1.89-3.62 0-2.95 2.14-5.66 6.18-5.66 3.25 0 5.77 2.32 5.77 5.42 0 3.23-2.03 5.83-4.85 5.83-1.07 0-2.08-.56-2.43-1.22l-.66 2.52c-.24.93-.89 2.09-1.33 2.8C10.75 21.93 11.37 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
)

// Formulaire newsletter fictif avec message de confirmation
function NewsletterForm({ t }: { t: any }) {
    const [email, setEmail] = useState('')
    const [subscribed, setSubscribed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || isLoading) return

        setIsLoading(true)
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            if (res.ok) {
                setSubscribed(true)
            }
        } catch (error) {
            console.error('Newsletter error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (subscribed) {
        return (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <p className="text-white text-sm font-bold">You will receive our news !</p>
            </div>
        )
    }

    return (
        <>
            <p className="text-gray-300 text-sm rtl:text-base rtl:font-bold font-medium mb-4">{t('NewsletterText')}</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    disabled={isLoading}
                    className="bg-gray-900 border-none rounded-2xl px-4 py-3 text-xs focus:ring-1 focus:ring-white outline-none w-full font-bold text-white placeholder-gray-600 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase shadow-lg hover:bg-gray-200 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                >
                    {isLoading ? '...' : t('Join')}
                </button>
            </form>
        </>
    )
}

export default function FooterClient({ features = {}, siteLogo = null, socials = {}, paymentSettings = {}, developer }: FooterProps = {}) {
    const locale = useLocale();
    const t = useTranslations('Footer');
    const tNav = useTranslations('Navigation');
    const tTrack = useTranslations('Tracking');
    const tJoinUs = useTranslations('JoinUs');

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer id="main-footer" className="bg-black text-white relative pb-[env(safe-area-inset-bottom)]">
            <GoogleReviewsBadge />

            {/* Top Bar with Back to Top */}
            <div className="bg-black border-b border-white/5 h-16 w-full flex items-center ltr:justify-end rtl:justify-start px-4 sm:px-6 lg:px-8">
                <button
                    onClick={scrollToTop}
                    className="group bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 shadow-xl hover:-translate-y-1 transition-all active:scale-95"
                >
                    <ArrowUp className="w-4 h-4 text-black" />
                    {t('BackToTop')}
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 md:pt-24 pb-16 md:pb-12 relative">
                {/* Vertical Social Sidebar */}
                <div className="absolute ltr:right-4 sm:ltr:-right-16 rtl:left-4 sm:rtl:-left-16 top-32 z-10 hidden xl:flex">
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full py-6 px-3 flex flex-col gap-6 shadow-2xl">
                        {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Instagram" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><Instagram className="w-5 h-5" /></a>}
                        {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur LinkedIn" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><Linkedin className="w-5 h-5" /></a>}
                        {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Facebook" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><Facebook className="w-5 h-5" /></a>}
                        {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Twitter" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><Twitter className="w-5 h-5" /></a>}
                        {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur YouTube" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><Youtube className="w-5 h-5" /></a>}
                        {socials.threads && <a href={socials.threads} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Threads" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><AtSign className="w-5 h-5" /></a>}
                        {socials.pinterest && <a href={socials.pinterest} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Pinterest" className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-90"><PinterestIcon className="w-5 h-5" /></a>}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 md:gap-16 mb-8 sm:mb-14 md:mb-20">
                    <div className="space-y-6 col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 group">
                            {siteLogo ? (
                                <Image
                                    src={siteLogo}
                                    alt="Tekno Store Logo"
                                    width={96}
                                    height={32}
                                    sizes="96px"
                                    quality={75}
                                    className="h-8 w-auto object-contain invert transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <>
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-black" />
                                    </div>
                                    <span className="text-2xl font-black text-white tracking-tighter">
                                        Tekno Store<span className="text-[#10b981]">.</span>
                                    </span>
                                </>
                            )}
                        </Link>
                        <p className="text-gray-300 text-sm rtl:text-base rtl:font-bold font-medium leading-relaxed max-w-xs">
                            {t('Slogan')}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-[11px] rtl:text-base font-black uppercase tracking-[0.3em] rtl:tracking-normal text-white/50 mb-4 md:mb-8">{t('Navigation')}</h3>
                        <ul className="space-y-4" suppressHydrationWarning>
                            <li suppressHydrationWarning>
                                <Link href="/books" title="Découvrir tous nos livres" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>{tNav('Books')}</Link>
                            </li>
                            <li suppressHydrationWarning>
                                <Link href="/books?usedOnly=true" title="Livres d'occasion à petits prix" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>
                                    {tNav('UsedBooks')}
                                </Link>
                            </li>
                            <li suppressHydrationWarning>
                                <Link href="/jeux-societe" title="Jeux de société pour tous" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>
                                    {tNav('BoardGames')}
                                </Link>
                            </li>
                            <li suppressHydrationWarning>
                                <Link href="/mon-enfant" title="Livres et activités pour enfants" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>
                                    {tNav('KidsWorld')}
                                </Link>
                            </li>
                            <li suppressHydrationWarning>
                                <Link href="/packs" title="Packs de livres économiques" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>{tNav('Packs')}</Link>
                            </li>
                            <li suppressHydrationWarning>
                                <Link href="/about" title="En savoir plus sur notre histoire" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>{t('About')}</Link>
                            </li>
                            {features.exchange === true && (
                                <li suppressHydrationWarning>
                                    <Link href="/community/market" title="Échanger vos livres entre lecteurs au Maroc" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>{tNav('Community')}</Link>
                                </li>
                            )}
                            {features.seller === true && (
                                <li suppressHydrationWarning>
                                    <Link href="/devenir-vendeur" title="Devenir revendeur et partenaire de livres au Maroc" className="text-pixio-yellow hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-black tracking-tight inline-flex items-center gap-2 group" suppressHydrationWarning>
                                        {tNav('BecomeSeller')}
                                    </Link>
                                </li>
                            )}
                            <li suppressHydrationWarning>
                                <Link href="/join-us" title="Rejoindre l'équipe Tekno Store" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight" suppressHydrationWarning>
                                    {tJoinUs('heroTitle1')} {tJoinUs('heroTitle2')}
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-[11px] rtl:text-base font-black uppercase tracking-[0.3em] rtl:tracking-normal text-white/50 mb-4 md:mb-8">{t('Support')}</h3>
                        <ul className="space-y-4">
                            <li><Link href="/shipping-policy" title="Politique et délais de livraison" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{t('Shipping')}</Link></li>
                            <li><Link href="/returns" title="Conditions de retour et remboursement" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{t('Returns')}</Link></li>
                            <li><Link href="/privacy" title="Protection de vos données personnelles" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{t('Privacy')}</Link></li>
                            <li><Link href="/terms" title="Conditions générales d'utilisation" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{t('Terms')}</Link></li>
                            <li><Link href="/contact" title="Nous contacter" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{t('Contact')}</Link></li>
                        </ul>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="text-[11px] rtl:text-base font-black uppercase tracking-[0.3em] rtl:tracking-normal text-white/50 mb-4 md:mb-8">{t('Journal')}</h3>
                        <ul className="space-y-4 mb-8">
                            <li><Link href="/blog" title="Lire notre blog et nos actualités" className="text-gray-300 hover:text-white transition-colors text-sm rtl:text-base rtl:tracking-normal font-bold tracking-tight">{tNav('Journal')}</Link></li>
                        </ul>
                        <NewsletterForm t={t} />
                        <div className="mt-4 flex justify-center md:justify-start">
                            <PushSubscribeButton />
                        </div>
                    </div>
                </div>

                {/* Mobile Socials */}
                <div className="flex xl:hidden gap-6 mb-6 sm:mb-12 justify-center">
                    {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Instagram" className="text-gray-400 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>}
                    {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur LinkedIn" className="text-gray-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>}
                    {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Facebook" className="text-gray-400 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>}
                    {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Twitter" className="text-gray-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>}
                    {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur YouTube" className="text-gray-400 hover:text-white transition-colors"><Youtube className="w-5 h-5" /></a>}
                    {socials.threads && <a href={socials.threads} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Threads" className="text-gray-400 hover:text-white transition-colors"><AtSign className="w-5 h-5" /></a>}
                    {socials.pinterest && <a href={socials.pinterest} target="_blank" rel="noopener noreferrer" aria-label="Tekno Store sur Pinterest" className="text-gray-400 hover:text-white transition-colors"><PinterestIcon className="w-5 h-5" /></a>}
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] rtl:text-base font-black uppercase tracking-widest rtl:tracking-normal text-gray-300 relative">
                    <p>© 2026 Tekno Store. {t('Rights')}</p>

                    <div className="md:absolute md:left-1/2 md:-translate-x-1/2 text-center">
                        <p className="hover:text-white transition-colors cursor-default">
                            {t.rich('DevelopedBy', {
                                name: (chunks) => (
                                    <a
                                        href={developer?.link || 'https://instagram.com/itsmereda1'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white font-bold hover:text-pixio-yellow transition-colors"
                                    >
                                        {developer?.name || chunks}
                                    </a>
                                )
                            })}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3 transition-opacity mt-4 md:mt-0">
                        {/* Visa */}
                        {paymentSettings?.stripe && (
                            <div className="h-7 px-2.5 bg-white rounded flex items-center justify-center cursor-default" title="Visa">
                                <svg viewBox="0 0 48 16" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <text x="0" y="13" fontFamily="Arial" fontWeight="900" fontSize="15" fill="#1A1F71" letterSpacing="-0.5">VISA</text>
                                </svg>
                            </div>
                        )}
                        {/* Mastercard */}
                        {paymentSettings?.stripe && (
                            <div className="h-7 px-2 bg-white rounded flex items-center gap-0.5 cursor-default" title="Mastercard">
                                <div className="w-5 h-5 bg-[#EB001B] rounded-full opacity-90" />
                                <div className="w-5 h-5 bg-[#F79E1B] rounded-full -ml-2.5" />
                            </div>
                        )}
                        {/* PayPal */}
                        {paymentSettings?.paypal && (
                            <div className="h-7 px-2.5 bg-white rounded flex items-center cursor-default" title="PayPal">
                                <svg viewBox="0 0 60 20" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
                                    <text x="0" y="15" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#003087">Pay</text>
                                    <text x="22" y="15" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#009CDE">Pal</text>
                                </svg>
                            </div>
                        )}
                        {/* CMI */}
                        {paymentSettings?.cmi && (
                            <div className="h-7 px-2.5 bg-white rounded flex items-center cursor-default" title="CMI">
                                <span className="text-[10px] font-black text-[#003865] tracking-widest">CMI</span>
                            </div>
                        )}
                        {/* COD */}
                        {paymentSettings?.cod && (
                            <div className="h-7 px-2.5 bg-white rounded flex items-center gap-1.5 cursor-default" title="Cash on Delivery">
                                <svg className="w-4 h-4 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm7-5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                                </svg>
                                <span className="text-[10px] font-black text-emerald-800 tracking-widest">COD</span>
                            </div>
                        )}
                        {/* Bank Transfer */}
                        {paymentSettings?.bank && (
                            <div className="h-7 px-2.5 bg-white rounded flex items-center gap-1.5 cursor-default" title="Virement Bancaire">
                                <svg className="w-4 h-4 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 10h18M3 14h18M12 3L3 10v11h18V10L12 3z" />
                                </svg>
                                <span className="text-[10px] font-black text-blue-900 tracking-widest">BANK</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}
