import { Plus } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetFAQ({ locale, limit }: { locale: string; limit?: number }) {
  const t = getPetContent(locale)
  return <div className="divide-y divide-[#17351d]/10 border-y border-[#17351d]/10">
    {t.questions.slice(0, limit).map(({ q, a }) => <details key={q} name="pet-faq" className="group py-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-lg py-6 text-start text-base font-semibold [&::-webkit-details-marker]:hidden">
        {q}<Plus className="h-5 w-5 shrink-0 text-[#82602d] transition-transform group-open:rotate-45" />
      </summary>
      <p className="max-w-3xl pb-6 pe-8 text-sm leading-8 text-[#56634e]">{a}</p>
    </details>)}
  </div>
}
