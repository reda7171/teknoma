import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Link } from '@/i18n/routing'
import { Mail, Phone, MapPin, MessageCircle, Clock, Globe, Instagram, Facebook, Linkedin, Twitter, Youtube, AtSign, ChevronRight } from 'lucide-react'
import { getAllSettings } from '@/lib/server/site-settings'
import { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'
import ContactFaq, { FaqItem } from '@/components/contact/ContactFaq'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'تواصل معنا | خدمة العملاء والدعم | رواية'
        : isEn
        ? 'Contact Us | Customer Support & Assistance | Riwaya'
        : 'Contactez-nous | Service Client & Support | Riwaya'

    const description = isAr
        ? 'فريق رواية رهن إشارتكم لجميع استفساراتكم حول الكتب، الطلبات والتوصيل عبر واتساب، الهاتف أو البريد الإلكتروني.'
        : isEn
        ? 'Riwaya customer care team is available for all your book inquiries, order tracking, and delivery support via WhatsApp, phone, or email.'
        : 'L’équipe Riwaya est à votre écoute pour toute question sur nos livres, vos commandes et nos livraisons par WhatsApp, téléphone ou email.'

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        title,
        description,
        alternates: {
            canonical: `${siteUrl}/${locale}/contact`,
            languages: {
                'fr': `${siteUrl}/fr/contact`,
                'ar': `${siteUrl}/ar/contact`,
                'en': `${siteUrl}/en/contact`,
                'x-default': `${siteUrl}/fr/contact`
            }
        },
        openGraph: {
            title,
            description,
            url: `${siteUrl}/${locale}/contact`,
            siteName: 'Riwaya',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_US' : 'fr_FR',
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        }
    }
}

export default async function ContactPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const t = await getTranslations('ContactPage')

    // Récupérer les paramètres du site
    const settings = await getAllSettings()
    const email = settings.contact_email || 'contact@riwaya.store'
    const phone = settings.contact_phone || '+212 702-220575'
    const address = settings.contact_address || 'Rabat, Maroc'
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const faqItems: FaqItem[] = isAr
        ? [
            {
                question: 'ما هي شروط وإجراءات إرجاع أو استبدال الكتب؟',
                answer: 'لديكم مهلة 3 أيام بعد الاستلام لطلب الإرجاع أو الاستبدال إذا كان الكتاب لا يطابق توقعاتكم. يتم استرجاع المبلغ عبر تحويل بنكي أو قسيمة شراء فورية دون أي تعقيد.',
                category: 'RETURN'
            },
            {
                question: 'ما هي مواعيد الشحن وتكاليف التوصيل في المغرب؟',
                answer: 'يتم تجهيز وشحن الطلبات خلال 24 ساعة. التوصيل يستغرق من 24 إلى 48 ساعة في كافة مدن المغرب بسعر 30 درهم (ومجاني للطلبات فوق 500 درهم). كما يتوفر الشحن الدولي السريع عبر أمانة.',
                category: 'SHIPPING'
            },
            {
                question: 'كيف يعمل الدفع عند الاستلام (COD)؟',
                answer: 'الدفع عند الاستلام آمن بنسبة 100% ودون أي تسبيق مالي: تسلمون المبلغ نقداً للمندوب عند استلام ومعاينة طردكم مباشرة في أيديكم.',
                category: 'PAYMENT'
            }
        ]
        : isEn
        ? [
            {
                question: 'What are the return and exchange terms?',
                answer: 'You have 3 calendar days after receipt to request a free return or exchange if a book does not match your expectations. Refunds are issued via bank transfer or an instant store voucher.',
                category: 'RETURN'
            },
            {
                question: 'What are the shipping times and delivery fees?',
                answer: 'Orders are dispatched within 24h. Delivery takes 24h to 48h throughout Morocco for 30 MAD (free for orders above 500 MAD). Worldwide express shipping is handled via Amana International.',
                category: 'SHIPPING'
            },
            {
                question: 'How does Cash on Delivery (COD) work?',
                answer: 'Cash on Delivery is 100% secure with zero upfront fees: you pay the courier directly in cash upon personal receipt and inspection of your package.',
                category: 'PAYMENT'
            }
        ]
        : [
            {
                question: 'Quelles sont les modalités de retour et d\'échange ?',
                answer: 'Vous disposez de 3 jours calendaires après réception pour demander un retour ou un échange sans frais si le livre présente un défaut ou ne correspond pas à vos attentes. Le remboursement s\'effectue par virement bancaire ou bon d\'achat immédiat.',
                category: 'RETURN'
            },
            {
                question: 'Quels sont les délais d\'expédition et frais de livraison ?',
                answer: 'Les commandes sont préparées et expédiées sous 24h. La livraison s\'effectue en 24h à 48h partout au Maroc pour 30 DH (offerte dès 500 DH d\'achat). Les envois internationaux express sont pris en charge par Amana International.',
                category: 'SHIPPING'
            },
            {
                question: 'Comment fonctionne le paiement à la livraison (COD) ?',
                answer: 'Le paiement à la livraison (Cash on Delivery) est 100% sécurisé et sans avance : vous payez directement le livreur en espèces lors de la remise de votre colis en main propre. Vous pouvez également payer en ligne par carte bancaire.',
                category: 'PAYMENT'
            }
        ]

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'ContactPage',
                '@id': `${siteUrl}/${locale}/contact#webpage`,
                url: `${siteUrl}/${locale}/contact`,
                name: `${t('Title1')} ${t('Title2')}`,
                description: t('Description'),
                inLanguage: locale,
                isPartOf: {
                    '@type': 'WebSite',
                    '@id': `${siteUrl}/#website`,
                    name: 'Riwaya',
                    url: siteUrl
                },
                breadcrumb: {
                    '@id': `${siteUrl}/${locale}/contact#breadcrumb`
                },
                mainEntity: {
                    '@type': 'Organization',
                    '@id': `${siteUrl}/#organization`,
                    name: 'Riwaya',
                    url: siteUrl,
                    logo: `${siteUrl}/logo.png`,
                    contactPoint: [
                        {
                            '@type': 'ContactPoint',
                            telephone: phone,
                            contactType: 'Customer Service',
                            email: email,
                            areaServed: 'MA',
                            availableLanguage: ['French', 'Arabic', 'English'],
                            contactOption: 'TollFree',
                            hoursAvailable: {
                                '@type': 'OpeningHoursSpecification',
                                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                                opens: '09:00',
                                closes: '19:00'
                            }
                        }
                    ]
                }
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${siteUrl}/${locale}/contact#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: t('BreadcrumbHome'),
                        item: `${siteUrl}/${locale}`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: t('BreadcrumbContact'),
                        item: `${siteUrl}/${locale}/contact`
                    }
                ]
            },
            {
                '@type': 'FAQPage',
                '@id': `${siteUrl}/${locale}/contact#faq`,
                mainEntity: faqItems.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: item.answer
                    }
                }))
            },
            {
                '@type': 'BookStore',
                '@id': `${siteUrl}/#localbusiness`,
                name: 'Librairie Riwaya',
                image: `${siteUrl}/og-image.jpg`,
                url: siteUrl,
                telephone: phone,
                email: email,
                priceRange: '50 MAD - 500 MAD',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: address,
                    addressLocality: 'Rabat',
                    addressRegion: 'Rabat-Salé-Kénitra',
                    postalCode: '10000',
                    addressCountry: 'MA'
                }
            }
        ]
    }

    // Réseaux sociaux
    const socials = {
        instagram: settings.social_instagram,
        facebook: settings.social_facebook,
        linkedin: settings.social_linkedin,
        twitter: settings.social_twitter,
        youtube: settings.social_youtube,
        threads: settings.social_threads,
        tiktok: settings.social_tiktok,
        snapchat: settings.social_snapchat,
    }

    const hasSocials = Object.values(socials).some(link => link)

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10 md:py-14 pb-20 sm:pb-32">
                {/* Fil d'Ariane SEO & Ergonomie */}
                <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8 flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
                    <Link href="/" className="hover:text-black transition-colors">
                        {t('BreadcrumbHome')}
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 rtl:rotate-180" />
                    <span className="font-bold text-gray-900" aria-current="page">
                        {t('BreadcrumbContact')}
                    </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-start">

                    {/* Contact Info */}
                    <div className="space-y-8 sm:space-y-12 md:space-y-16">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-black text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4">
                                <Globe className="w-3 h-3" />
                                {t('CustomerSupport')}
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-black tracking-tighter leading-none italic break-words">
                                {t('Title1')}<br />{t('Title2')}<span className="text-gray-200">.</span>
                            </h1>
                            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-400 uppercase tracking-tight max-w-md">
                                {t('Description')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
                            {/* Téléphone */}
                            <a
                                href={`tel:${phone.replace(/\s+/g, '')}`}
                                className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md border border-gray-100 hover:border-black/20 flex items-center gap-4 transition-all duration-300"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-2xl flex items-center justify-center shrink-0 text-black shadow-inner transition-colors duration-300">
                                    <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{t('Phone')}</h3>
                                    <p className="text-sm sm:text-base font-black text-black group-hover:text-pixio-yellow transition-colors break-words">{phone}</p>
                                </div>
                            </a>

                            {/* Email direct */}
                            <a
                                href={`mailto:${email}`}
                                className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md border border-gray-100 hover:border-black/20 flex items-center gap-4 transition-all duration-300"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-2xl flex items-center justify-center shrink-0 text-black shadow-inner transition-colors duration-300">
                                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{t('DirectEmail')}</h3>
                                    <p className="text-sm sm:text-base font-black text-black group-hover:text-pixio-yellow transition-colors break-words">{email}</p>
                                </div>
                            </a>

                            {/* Horaires */}
                            <div className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center gap-4 transition-all duration-300">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 text-black shadow-inner">
                                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{t('Hours')}</h3>
                                    <p className="text-sm sm:text-base font-black text-black break-words">{t('HoursDetail')}</p>
                                </div>
                            </div>

                            {/* Siège / Adresse */}
                            <div className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center gap-4 transition-all duration-300">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 text-black shadow-inner">
                                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{t('Headquarters')}</h3>
                                    <p className="text-sm sm:text-base font-black text-black break-words">{address}</p>
                                </div>
                            </div>
                        </div>

                        {/* Accordéon interactif FAQ directement sous les coordonnées de contact */}
                        <ContactFaq
                            items={faqItems}
                            title={isAr ? 'الأسئلة الشائعة حول الطلبات' : isEn ? 'Orders & Delivery FAQ' : 'Questions Fréquentes'}
                            subtitle={isAr ? 'المرتجعات، مواعيد الشحن والدفع عند الاستلام' : isEn ? 'Returns, shipping & cash on delivery' : 'Modalités de retour, délais d\'expédition & paiement COD'}
                        />

                        {/* WhatsApp Channel Invite */}
                        <div className="mt-8 md:mt-12 bg-green-50 border border-green-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:bg-green-100 transition-colors">
                            <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                <MessageCircle className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
                                <h3 className="text-xl font-black text-green-950 mb-2">{t('WhatsAppTitle')}</h3>
                                <p className="text-green-800 font-medium text-sm mb-4">{t('WhatsAppDesc')}</p>
                                <a
                                    href="https://chat.whatsapp.com/BEKvpmcSTP73Y6zKvFR4oI?s=sw&p=a&ilr=1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-[#25D366] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t('Subscribe')}
                                </a>
                            </div>
                        </div>

                        {/* Google Review Invite */}
                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group hover:bg-blue-100 transition-colors">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                                {/* Google "G" Logo */}
                                <svg width="32" height="32" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                            </div>
                            <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
                                <h3 className="text-xl font-black text-blue-950 mb-2">{t('GoogleTitle')}</h3>
                                <p className="text-blue-800 font-medium text-sm mb-4">{t('GoogleDesc')}</p>
                                <a
                                    href="https://maps.app.goo.gl/nwtkWtehXCZkt3Cm7"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    {t('WriteReview')}
                                </a>
                            </div>
                        </div>

                        {/* Social Networks */}
                        {hasSocials && (
                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">{t('SocialNetworks')}</h3>
                                <div className="flex flex-wrap gap-4">
                                    {socials.instagram && (
                                        <a aria-label="Action Instagram" href={socials.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.facebook && (
                                        <a aria-label="Action Facebook" href={socials.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#1877F2] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.linkedin && (
                                        <a aria-label="Action Linkedin" href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#0A66C2] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.twitter && (
                                        <a aria-label="Action Twitter" href={socials.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.youtube && (
                                        <a aria-label="Action Youtube" href={socials.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#FF0000] hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <Youtube className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.threads && (
                                        <a aria-label="Action AtSign" href={socials.threads} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <AtSign className="w-5 h-5" />
                                        </a>
                                    )}
                                    {socials.tiktok && (
                                        <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md hover:bg-black hover:text-white hover:-translate-y-1 transition-all duration-300">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                                        </a>
                                    )}

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 sm:p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 relative mt-8 lg:mt-0">
                        <div className="absolute -top-6 -right-2 md:-right-6 w-20 h-20 md:w-24 md:h-24 bg-pixio-yellow rounded-full flex items-center justify-center rotate-12 shadow-xl">
                            <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-black" />
                        </div>

                        <ContactForm />
                    </div>

                </div>
            </main>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <Footer />
        </div>
    )
}
