import { requirePageRole } from '@/lib/page-authorization'
import { getQuotes } from '@/lib/actions/quotes'
import { getAllAuthors } from '@/lib/actions/admin-authors'
import QuotesClient from './QuotesClient'
import { Quote } from 'lucide-react'

export const metadata = {
    title: 'Gestion des Citations | Admin',
}

export default async function QuotesPage(props: { searchParams: Promise<{ q?: string, tag?: string }> }) {
    await requirePageRole(["ADMIN","MANAGER"])

    const searchParams = await props.searchParams
    const q = searchParams.q || ''
    const tag = searchParams.tag || ''

    const quotes = await getQuotes(q, tag)
    const authorsResult = await getAllAuthors()
    const authors = authorsResult.success ? authorsResult.data.map(a => a.name) : []

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Quote className="w-8 h-8 text-black" />
                        Citations (Quotes)
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Gérez la bibliothèque de citations, les auteurs, les tags et associez-les aux livres.</p>
                </div>
            </div>

            <QuotesClient initialQuotes={quotes} authors={authors} />
        </div>
    )
}
