import { Plus } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetFAQ({ locale, limit }: { locale: string; limit?: number }) {
  const t = getPetContent(locale)
  return (
    <div className="divide-y divide-gray-200">
      {t.questions.slice(0, limit).map(({ q, a }) => (
        <details key={q} name="pet-faq" className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-lg py-5 text-start text-sm sm:text-base font-bold text-[#1A1C1F] hover:text-[#1976D2] transition-colors [&::-webkit-details-marker]:hidden">
            {q}
            <Plus className="h-4 w-4 shrink-0 text-[#1976D2] transition-transform duration-200 group-open:rotate-45 group-open:text-[#75C300]" />
          </summary>
          <p className="max-w-3xl pb-5 pe-6 text-xs sm:text-sm leading-7 text-gray-600">{a}</p>
        </details>
      ))}
    </div>
  )
}
