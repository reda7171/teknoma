'use client'

import { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import { ArrowUpRight, Cpu, Search, Filter } from 'lucide-react'
import ProductCard from './ProductCard'

interface Product {
  id: string
  title: string
  titleFr?: string | null
  titleEn?: string | null
  author: string
  price: number
  image: string
  stock: number
  category?: string | null
}

interface PetProductGridProps {
  products: Product[]
  locale: string
  allLabel: string
  viewAllLabel: string
  emptyTitle: string
  emptyText: string
}

const TABS = [
  { key: 'ALL', labelFr: 'Tous', labelEn: 'All', labelAr: 'الكل' },
  { key: 'Chats', labelFr: 'Chats', labelEn: 'Cats', labelAr: 'القطط' },
  { key: 'Chiens', labelFr: 'Chiens', labelEn: 'Dogs', labelAr: 'الكلاب' },
  { key: 'Alimentation', labelFr: 'Alimentation', labelEn: 'Food', labelAr: 'التغذية' },
  { key: 'Accessoires', labelFr: 'Accessoires', labelEn: 'Accessories', labelAr: 'الإكسسوارات' },
  { key: 'Hygiène et soins', labelFr: 'Soins & Hygiène', labelEn: 'Care', labelAr: 'العناية' }
]

export default function PetProductGrid({
  products,
  locale,
  allLabel,
  viewAllLabel,
  emptyTitle,
  emptyText
}: PetProductGridProps) {
  const [activeTab, setActiveTab] = useState('ALL')

  const filteredProducts = useMemo(() => {
    if (activeTab === 'ALL') return products
    return products.filter((p) => {
      const cat = (p.category || '').toLowerCase()
      const tabLower = activeTab.toLowerCase()
      return cat.includes(tabLower) || (p.title || '').toLowerCase().includes(tabLower)
    })
  }, [products, activeTab])

  return (
    <div className="mt-8 space-y-8">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TABS.map((tab) => {
          const label = locale === 'ar' ? tab.labelAr : locale === 'en' ? tab.labelEn : tab.labelFr
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#17351d] text-[#fff9eb] shadow-sm'
                  : 'bg-[#f7f0df]/80 text-[#56634e] hover:bg-[#ebdcc0] hover:text-[#17351d]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Grid of products */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#c59a55]/50 bg-[#f7f0df]/40 px-6 py-12 text-center">
          <Cpu className="mx-auto mb-3 h-8 w-8 text-[#a07738]" />
          <h3 className="text-base font-bold text-[#17351d]">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#68705f]">{emptyText}</p>
        </div>
      )}
    </div>
  )
}

