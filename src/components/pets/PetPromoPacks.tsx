import { Link } from '@/i18n/routing'
import { Sparkles, ArrowUpRight, Check, ShieldCheck, Tag, Zap } from 'lucide-react'

interface PackItem {
  id: string
  title: string
  target: string
  price: number
  oldPrice: number
  discount: string
  badge: string
  items: string[]
  color: string
}

const PACKS_BY_LOCALE: Record<string, PackItem[]> = {
  fr: [
    {
      id: 'pack-apple-nomade',
      title: 'Pack Apple Nomade Pro',
      target: 'Pour créateurs, développeurs & étudiants',
      price: 16990,
      oldPrice: 18170,
      discount: '-1 180 MAD',
      badge: 'Bestseller Apple',
      items: [
        'MacBook Air 13" Puce M3 (16GB RAM / 512GB SSD)',
        'AirPods Pro 2 avec boîtier MagSafe USB-C',
        'Hub USB-C Satechi 8-en-1 Dual 4K HDMI + PD 100W',
        'Housse de transport antichoc offerte'
      ],
      color: 'bg-[#e8ecdf]'
    },
    {
      id: 'pack-smartphone-power',
      title: 'Pack Smartphone Power Ultimate',
      target: 'Équipement mobile complet & charge rapide',
      price: 15790,
      oldPrice: 16270,
      discount: '-480 MAD',
      badge: 'Pack Recommandé',
      items: [
        'iPhone 16 Pro Max 256GB Titane Naturel',
        'Chargeur mural Anker Prime 67W GaN 3 ports',
        'Batterie externe MagSafe 10000mAh',
        'Câble USB-C tressé renforcé 2M inclus'
      ],
      color: 'bg-[#f0e3ce]'
    },
    {
      id: 'pack-bureau-setup',
      title: 'Pack Setup & Productivité Bureau',
      target: 'Pour télétravail et configuration double écran',
      price: 2990,
      oldPrice: 3370,
      discount: '-380 MAD',
      badge: 'Pack Productivité',
      items: [
        'Souris sans fil ergonomique Logitech MX Master 3S',
        'Disque SSD Externe Samsung T7 Shield 1TB (1050 Mo/s)',
        'Hub USB-C multi-ports Satechi HDMI 4K + Ethernet',
        'Tapis de bureau grande taille en cuir PU'
      ],
      color: 'bg-[#eee5d5]'
    }
  ],
  en: [
    {
      id: 'pack-apple-nomade',
      title: 'Apple Nomad Pro Bundle',
      target: 'For creators, developers & students',
      price: 16990,
      oldPrice: 18170,
      discount: '-1,180 MAD',
      badge: 'Apple Bestseller',
      items: [
        'MacBook Air 13" M3 Chip (16GB RAM / 512GB SSD)',
        'AirPods Pro 2 with USB-C MagSafe Case',
        'Satechi 8-in-1 Dual 4K HDMI USB-C Hub',
        'Complimentary protective laptop sleeve'
      ],
      color: 'bg-[#e8ecdf]'
    },
    {
      id: 'pack-smartphone-power',
      title: 'Smartphone Ultimate Power Pack',
      target: 'Complete mobile setup with fast charging',
      price: 15790,
      oldPrice: 16270,
      discount: '-480 MAD',
      badge: 'Recommended Pack',
      items: [
        'iPhone 16 Pro Max 256GB Natural Titanium',
        'Anker Prime 67W GaN 3-Port Wall Charger',
        'MagSafe 10,000mAh Wireless Power Bank',
        'Reinforced 2M braided USB-C cable included'
      ],
      color: 'bg-[#f0e3ce]'
    },
    {
      id: 'pack-bureau-setup',
      title: 'Desktop Workspace Productivity Pack',
      target: 'For remote workers & dual monitor setups',
      price: 2990,
      oldPrice: 3370,
      discount: '-380 MAD',
      badge: 'Productivity Pack',
      items: [
        'Logitech MX Master 3S Wireless Ergonomic Mouse',
        'Samsung T7 Shield 1TB Rugged External SSD',
        'Satechi USB-C Multi-port 4K HDMI Hub',
        'Extended PU leather desk pad'
      ],
      color: 'bg-[#eee5d5]'
    }
  ],
  ar: [
    {
      id: 'pack-apple-nomade',
      title: 'باقة آبل للمحترفين (Nomad Pro)',
      target: 'للمصممين، المبرمجين والطلاب',
      price: 16990,
      oldPrice: 18170,
      discount: 'توفير 1180 درهم',
      badge: 'الأكثر طلباً',
      items: [
        'ماك بوك إير 13 بوصة بشريحة M3 (16GB رام / 512GB SSD)',
        'سماعات آبل إيربودز برو 2 بعلبة USB-C MagSafe',
        'محول USB-C متعدد المنافذ 8 في 1 Satechi بدقة 4K',
        'حقيبة حماية فاخرة للماك مجاناً'
      ],
      color: 'bg-[#e8ecdf]'
    },
    {
      id: 'pack-smartphone-power',
      title: 'باقة الطاقة للهواتف الذكية',
      target: 'تجهيز كامل للهاتف مع شحن فائق السرعة',
      price: 15790,
      oldPrice: 16270,
      discount: 'توفير 480 درهم',
      badge: 'عرض موصى به',
      items: [
        'آيفون 16 برو ماكس 256GB تيتانيوم طبيعي',
        'شاحن أنكر برايم سريع 67W GaN بثلاثة منافذ',
        'بطارية متنقلة MagSafe بسعة 10000mAh',
        'كابل شحن سريع USB-C معزز بطول 2 متر'
      ],
      color: 'bg-[#f0e3ce]'
    },
    {
      id: 'pack-bureau-setup',
      title: 'باقة المكتب والإنتاجية المتكاملة',
      target: 'للعمل عن بعد وصناع المحتوى',
      price: 2990,
      oldPrice: 3370,
      discount: 'توفير 380 درهم',
      badge: 'باقة الإنتاجية',
      items: [
        'فأرة لوجيتك اللاسلكية المريحة MX Master 3S',
        'قرص تخزين خارجي فائق السرعة سامسونج T7 بسعة 1 تيرابايت',
        'موزع منافذ USB-C من ساتيتشي يدعم شاشات 4K',
        'بساط مكتب كبير فاخر'
      ],
      color: 'bg-[#eee5d5]'
    }
  ]
}

export default function PetPromoPacks({
  locale,
  title,
  subtitle,
  orderNowLabel,
}: {
  locale: string
  title: string
  subtitle: string
  orderNowLabel: string
}) {
  const packs = PACKS_BY_LOCALE[locale] || PACKS_BY_LOCALE.fr

  return (
    <section className="bg-white py-16 sm:py-20 border-b border-[#17351d]/10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c59a55]/40 bg-[#f7f0df] px-3.5 py-1 text-xs font-bold text-[#82602d]">
            <Zap className="h-3.5 w-3.5 text-[#96703a]" />
            <span>Offres Spéciales Tekno.ma</span>
          </div>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#17351d] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#56634e]">
            {subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col justify-between rounded-3xl p-7 border border-[#17351d]/10 transition hover:-translate-y-1 hover:shadow-xl ${pack.color}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#17351d] shadow-xs">
                    {pack.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-black text-white shadow-xs">
                    <Tag className="h-3 w-3" />
                    {pack.discount}
                  </span>
                </div>

                <h3 className="mt-5 font-serif text-2xl font-bold text-[#17351d]">
                  {pack.title}
                </h3>
                <p className="mt-1 text-xs text-[#56634e] font-medium">
                  {pack.target}
                </p>

                <div className="mt-6 flex items-baseline gap-3">
                  <span className="text-3xl font-black text-[#17351d]">
                    {pack.price.toLocaleString('fr-FR')} <span className="text-base font-bold">MAD</span>
                  </span>
                  <span className="text-sm font-semibold text-gray-500 line-through">
                    {pack.oldPrice.toLocaleString('fr-FR')} MAD
                  </span>
                </div>

                <div className="mt-6 space-y-2.5 border-t border-[#17351d]/15 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#82602d]">
                    Équipements inclus :
                  </p>
                  {pack.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#2b3a26]">
                      <Check className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-[#17351d]/15 pt-5">
                <div className="mb-4 flex items-center gap-2 text-[11px] text-[#56634e]">
                  <ShieldCheck className="h-4 w-4 text-[#96703a]" />
                  <span>Livraison gratuite + Garantie officielle</span>
                </div>
                <Link
                  href="/products"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17351d] py-3.5 text-center text-xs font-bold text-white transition hover:bg-[#284b2c] active:scale-95 shadow-sm"
                >
                  <span>{orderNowLabel}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
