import { MapPin, Navigation, ExternalLink, Clock } from 'lucide-react'

// URL officielle Google Maps du magasin Tekno Store
export const TEKNO_MAP_URL = 'https://maps.app.goo.gl/iX2HNyrN1gfnkgc98'
const TEKNO_LAT = 34.0765251
const TEKNO_LNG = -6.7669292

const copy = {
    fr: {
        badge: 'Notre Magasin',
        title: 'Visitez Tekno Store',
        subtitle: 'Retrouvez notre point de vente et de retrait sur place. Venez découvrir nos smartphones, PC portables, Mac et accessoires neufs et scellés.',
        storeName: 'Tekno Store — Magasin High-Tech',
        hoursLabel: 'Horaires d’ouverture',
        hoursValue: 'Lun - Dim : 10h00 - 21h00',
        directions: 'Itinéraire Google Maps',
        iframeTitle: 'Localisation du magasin Tekno Store sur Google Maps'
    },
    en: {
        badge: 'Our Store',
        title: 'Visit Tekno Store',
        subtitle: 'Find our physical store and pickup point. Come explore our brand-new sealed smartphones, laptops, MacBooks, and accessories.',
        storeName: 'Tekno Store — High-Tech Store',
        hoursLabel: 'Opening Hours',
        hoursValue: 'Mon - Sun: 10:00 AM - 9:00 PM',
        directions: 'Open in Google Maps',
        iframeTitle: 'Tekno Store location on Google Maps'
    },
    ar: {
        badge: 'متجرنا',
        title: 'زيارة متجر Tekno Store',
        subtitle: 'تفضل بزيارة متجرنا ونقطة الاستلام المباشر لاكتشاف أحدث الهواتف الذكية، الحواسيب المحمولة، أجهزة ماك والإكسسوارات الأصلية.',
        storeName: 'Tekno Store — متجر التكنولوجيا',
        hoursLabel: 'أوقات العمل',
        hoursValue: 'الإثنين - الأحد: 10:00 - 21:00',
        directions: 'الاتجاهات عبر خرائط جوجل',
        iframeTitle: 'موقع متجر Tekno Store على خرائط جوجل'
    }
} as const

export default function StoreMapSection({ locale }: { locale: string }) {
    const t = copy[(locale in copy ? locale : 'fr') as keyof typeof copy]
    const hl = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr'
    const embedSrc = `https://www.google.com/maps?q=${TEKNO_LAT},${TEKNO_LNG}&hl=${hl}&z=16&output=embed`

    return (
        <section aria-labelledby="store-map-title" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr]">
                    {/* Informations du magasin */}
                    <div className="flex flex-col justify-between bg-[#1A1C1F] p-7 text-white sm:p-10">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#75C300]/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#75C300]">
                                <MapPin className="h-3.5 w-3.5" />
                                {t.badge}
                            </span>

                            <h2 id="store-map-title" className="mt-5 font-sans text-2xl font-black tracking-tight sm:text-3xl">
                                {t.title}
                            </h2>

                            <p className="mt-3 text-sm leading-relaxed text-gray-300">
                                {t.subtitle}
                            </p>

                            <div className="mt-7 space-y-4 border-t border-white/10 pt-6">
                                <div className="flex items-start gap-3">
                                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#75C300]" />
                                    <div>
                                        <p className="text-sm font-bold text-white">{t.storeName}</p>
                                        <p className="mt-0.5 text-xs text-gray-400" dir="ltr">
                                            {TEKNO_LAT.toFixed(5)}, {TEKNO_LNG.toFixed(5)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1976D2]" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            {t.hoursLabel}
                                        </p>
                                        <p className="mt-0.5 text-sm font-medium text-white">
                                            {t.hoursValue}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <a
                                href={TEKNO_MAP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#75C300] px-5 py-3.5 text-sm font-black text-[#1A1C1F] transition-colors hover:bg-[#68ad00] sm:w-auto"
                            >
                                <Navigation className="h-4 w-4" />
                                <span>{t.directions}</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* Carte Google Maps intégrée */}
                    <div className="relative min-h-[340px] w-full bg-gray-100 lg:min-h-[420px]">
                        <iframe
                            src={embedSrc}
                            title={t.iframeTitle}
                            className="h-full min-h-[340px] w-full border-0 lg:min-h-[420px]"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
