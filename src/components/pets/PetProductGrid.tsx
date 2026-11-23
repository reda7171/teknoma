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
  { key: 'ALL', labelFr: 'Tous les produits', labelEn: 'All Products', labelAr: 'الكل' },
  { key: 'Smartphones', labelFr: 'Smartphones', labelEn: 'Smartphones', labelAr: 'الهواتف الذكية' },
  { key: 'PC Portables', labelFr: 'PC Portables', labelEn: 'Laptops', labelAr: 'حواسيب محمولة' },
  { key: 'Mac', labelFr: 'Mac & Apple', labelEn: 'Mac & Apple', labelAr: 'ماك وآبل' },
  { key: 'Accessoires', labelFr: 'Accessoires', labelEn: 'Accessories', labelAr: 'الإكسسوارات' },
  { key: 'Audio', labelFr: 'Audio & Casques', labelEn: 'Audio', labelAr: 'صوتيات' },
  { key: 'Stockage', labelFr: 'Stockage & SSD', labelEn: 'Storage', labelAr: 'وحدات تخزين' }
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
      {/* Category Tabs (MicroMagma style pills) */}
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
                  ? 'bg-[#1A1C1F] text-[#75C300] shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-[#1976D2] hover:text-[#1976D2]'
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
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Cpu className="mx-auto mb-3 h-8 w-8 text-[#1976D2]" />
          <h3 className="text-base font-bold text-[#1A1C1F]">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-gray-500">{emptyText}</p>
        </div>
      )}
    </div>
  )
}
