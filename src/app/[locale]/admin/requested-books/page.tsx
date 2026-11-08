import { requirePageRole } from '@/lib/page-authorization'
import { getRequestedBooks } from '@/lib/actions/requested-books'
import RequestedBooksClient from './RequestedBooksClient'
import { Search } from 'lucide-react'

export default async function AdminRequestedBooksPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    const { data: books } = await getRequestedBooks()

    return (
        <div className="space-y-12">
            <div>
                <h1 className="text-4xl font-black text-black tracking-tighter">
                    Titres Demandés<span className="text-blue-600">.</span>
                </h1>
                <p className="mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose">
                    Gérez et analysez les livres demandés par vos clients
                </p>
            </div>

            <RequestedBooksClient initialBooks={books || []} />
        </div>
    )
}
