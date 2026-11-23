import { Star, CheckCircle2, Quote, Laptop, Smartphone, Headphones } from 'lucide-react'

interface Testimonial {
  name: string
  device: string
  city: string
  rating: number
  date: string
  text: string
  badge: string
}

const REVIEWS: Record<string, Testimonial[]> = {
  fr: [
    {
      name: 'Salma Benali',
      device: 'MacBook Air M3 16GB',
      city: 'Casablanca',
      rating: 5,
      date: 'Il y a 2 jours',
      text: 'Commandé le matin, reçu le lendemain à Casablanca ! Le MacBook était neuf sous blister d’origine avec le scellé Apple intact. Pouvoir vérifier le colis avant de payer au livreur est super rassurant.',
      badge: 'Achat Vérifié · COD'
    },
    {
      name: 'Youssef El Amrani',
      device: 'iPhone 16 Pro Max 256GB',
      city: 'Rabat',
      rating: 5,
      date: 'Il y a 5 jours',
      text: 'Service impeccable. J’ai contacté l’équipe sur WhatsApp pour confirmer la disponibilité et j’ai été livré en 24h. L’iPhone est authentique et la garantie constructeur s’active parfaitement.',
      badge: 'Achat Vérifié'
    },
    {
      name: 'Kenza Tazi',
      device: 'AirPods Pro 2 MagSafe',
      city: 'Marrakech',
      rating: 5,
      date: 'Il y a 1 semaine',
      text: 'Très satisfaite de mon achat sur Tekno Store. Les AirPods sont 100% originaux avec détection immédiate sur iOS. Livraison rapide à Guéliz et emballage antichoc impeccable.',
      badge: 'Commande vérifiée'
    },
    {
      name: 'Mehdi Chraibi',
      device: 'ASUS ROG Strix G16 (RTX 4070)',
      city: 'Tanger',
      rating: 5,
      date: 'Il y a 2 semaines',
      text: 'Une bête de course pour le gaming et le dev ! Prix imbattable au Maroc et service client réactif qui m’a guidé sur les spécifications. Je recommande Tekno.ma les yeux fermés.',
      badge: 'Client Vérifié'
    }
  ],
  en: [
    {
      name: 'Salma Benali',
      device: 'MacBook Air M3 16GB',
      city: 'Casablanca',
      rating: 5,
      date: '2 days ago',
      text: 'Ordered in the morning and delivered the next day in Casablanca! Brand new sealed Apple product. Paying upon delivery after checking the parcel is so reassuring.',
      badge: 'Verified Purchase · COD'
    },
    {
      name: 'Youssef El Amrani',
      device: 'iPhone 16 Pro Max 256GB',
      city: 'Rabat',
      rating: 5,
      date: '5 days ago',
      text: 'Outstanding service. Contacted WhatsApp support to confirm stock and received it within 24h. 100% original phone with genuine Apple warranty.',
      badge: 'Verified Purchase'
    },
    {
      name: 'Kenza Tazi',
      device: 'AirPods Pro 2 MagSafe',
      city: 'Marrakech',
      rating: 5,
      date: '1 week ago',
      text: 'Extremely happy with my purchase from Tekno Store. Seamless connection on iOS and fast express delivery in Marrakech.',
      badge: 'Verified Order'
    },
    {
      name: 'Mehdi Chraibi',
      device: 'ASUS ROG Strix G16 (RTX 4070)',
      city: 'Tangier',
      rating: 5,
      date: '2 weeks ago',
      text: 'A gaming powerhouse! Best price in Morocco and helpful support team. Highly recommend Tekno.ma to everyone.',
      badge: 'Verified Customer'
    }
  ],
  ar: [
    {
      name: 'سلمى بنعلي',
      device: 'ماك بوك إير M3 بذاكرة 16GB',
      city: 'الدار البيضاء',
      rating: 5,
      date: 'منذ يومين',
      text: 'طلبت الجهاز في الصباح وتوصلت به في اليوم الموالي في الدار البيضاء! الجهاز أصلي وجديد بالعلبة المغلقة تماماً. ميزة الدفع عند الاستلام مريحة وموثوقة جداً.',
      badge: 'شراء موثق · دفع عند الاستلام'
    },
    {
      name: 'يوسف العمراني',
      device: 'آيفون 16 برو ماكس 256GB',
      city: 'الرباط',
      rating: 5,
      date: 'منذ 5 أيام',
      text: 'خدمة احترافية ممتازة. تواصلت مع فريق الدعم عبر واتساب لتأكيد الموديل وتم التوصيل خلال 24 ساعة. الهاتف أصلي وضمان آبل مفعل بشكل كامل.',
      badge: 'شراء موثق'
    },
    {
      name: 'كنزة التازي',
      device: 'سماعات إيربودز برو 2',
      city: 'مراكش',
      rating: 5,
      date: 'منذ أسبوع',
      text: 'تجربة ممتازة مع متجر Tekno Store. السماعات أصلية 100% وتم التعرف عليها فوراً في الآيفون. التوصيل كان سريعاً والتغليف محكم جداً.',
      badge: 'طلبية موثقة'
    },
    {
      name: 'مهدي الشرايبي',
      device: 'حاسوب ألعاب ASUS ROG Strix (RTX 4070)',
      city: 'طنجة',
      rating: 5,
      date: 'منذ أسبوعين',
      text: 'أداء خارق للألعاب والبرمجة! أفضل سعر مقارنة بالسوق المغربي وفريق متعاون جداً عبر واتساب. أنصح بـ Tekno.ma لكل عشاق التكنولوجيا.',
      badge: 'زبون موثق'
    }
  ]
}

export default function PetTestimonials({
  locale,
  title,
  subtitle,
}: {
  locale: string
  title: string
  subtitle: string
}) {
  const reviews = REVIEWS[locale] || REVIEWS.fr

  return (
    <section className="bg-[#fbf9f3] py-16 sm:py-20 border-b border-[#17351d]/10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#c59a55]/40 bg-[#f7f0df] px-3.5 py-1 text-xs font-bold text-[#82602d]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
            <span>Avis Clients Vérifiés Tekno Store</span>
          </div>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#17351d] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#56634e]">
            {subtitle}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((rev, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-3xl border border-[#17351d]/10 bg-white p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{rev.date}</span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-[#2b3a26]">
                  "{rev.text}"
                </p>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#17351d]">{rev.name}</p>
                    <p className="text-[11px] text-[#82602d] font-semibold">{rev.device}</p>
                    <p className="text-[10px] text-gray-500">{rev.city}</p>
                  </div>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{rev.badge}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
