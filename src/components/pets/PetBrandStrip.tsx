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
    <section className="border-y border-gray-200/80 bg-white py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#1976D2]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1C1F]">{title}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-[#75C300]" />
            <span>100% de produits certifiés d’origine, neufs sous blister avec garantie constructeur</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {BRANDS.map((brand) => (
            <Link
              key={brand.name}
              href={'/products?brand=' + encodeURIComponent(brand.name)}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-center transition hover:-translate-y-1 hover:border-[#1976D2] hover:bg-white hover:shadow-md"
            >
              <Cpu className="mb-1.5 h-4 w-4 text-[#1976D2]" />
              <span className="text-xs font-bold text-[#1A1C1F]">{brand.name}</span>
              <span className="mt-1 text-[10px] text-gray-500">{brand.tag}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
