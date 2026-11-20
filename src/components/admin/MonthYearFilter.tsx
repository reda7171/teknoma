'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

export default function MonthYearFilter() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentMonth = searchParams.get('month') || ''
    const currentYear = searchParams.get('year') || new Date().getFullYear().toString()

    const handleFilter = (month: string, year: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (month) params.set('month', month)
        else params.delete('month')
        
        if (year) params.set('year', year)
        else params.delete('year')

        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select aria-label="Champ de sélection" 
                value={currentMonth}
                onChange={(e) => handleFilter(e.target.value, currentYear)}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer outline-none"
            >
                <option value="">Tous les mois</option>
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
            </select>

            <span className="text-gray-300">/</span>

            <select aria-label="Champ de sélection" 
                value={currentYear}
                onChange={(e) => handleFilter(currentMonth, e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer outline-none"
            >
                {Array.from({ length: 5 }).map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year.toString()}>{year}</option>
                })}
            </select>
        </div>
    )
}
