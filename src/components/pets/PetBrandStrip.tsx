import { Cpu, Award, ShieldCheck } from 'lucide-react'
import { Link } from '@/i18n/routing'

const BRANDS = [
  { name: 'Apple', tag: 'iPhone, Mac & iPad' },
  { name: 'Samsung', tag: 'Galaxy & Écrans' },
  { name: 'Xiaomi', tag: 'Ultra & Fast Charge' },
  { name: 'Dell', tag: 'XPS & Inspiron' },
  { name: 'HP', tag: 'Spectre & Pavilion' },
  { name: 'Lenovo', tag: 'Legion & ThinkPad' },
  { name: 'Asus', tag: 'ROG & ZenBook' },
  { name: 'Sony', tag: 'Audio Hi-Res & ANC' },
]

export default function PetBrandStrip({ title }: { title: string }) {
  return (
    <section className="border-b border-[#17351d]/10 bg-[#fbf9f3] py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#96703a]" />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82602d]">{title}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#56634e]">
            <ShieldCheck className="h-4 w-4 text-[#96703a]" />
            <span>100% de produits certifiés d’origine, neufs sous blister avec garantie constructeur</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {BRANDS.map((brand) => (
            <Link
              key={brand.name}
              href={'/products?brand=' + encodeURIComponent(brand.name)}
              className="flex flex-col items-center justify-center rounded-2xl border border-[#17351d]/10 bg-white p-3.5 text-center shadow-xs transition hover:-translate-y-1 hover:border-blue-600 hover:shadow-md"
            >
              <Cpu className="mb-1.5 h-4 w-4 text-[#96703a]/70" />
              <span className="text-xs font-bold text-[#17351d]">{brand.name}</span>
              <span className="mt-1 text-[10px] text-[#6d7966]">{brand.tag}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
