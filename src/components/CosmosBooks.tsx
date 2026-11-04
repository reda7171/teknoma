import Image from 'next/image'
import { normalizeImage } from '@/lib/utils'
import { Link } from '@/i18n/routing'

interface OrbitBook {
  id: string
  title: string
  image: string
  price: number
  author?: string
}

interface CosmosBooksProps {
  books: OrbitBook[]
  centerBook: OrbitBook
  autoRotateCenter?: boolean
  autoRotateInterval?: number
}

export default function CosmosBooks({
  books,
  centerBook,
}: CosmosBooksProps) {
  const allBooks = [centerBook, ...books.filter(b => b.id !== centerBook.id)].slice(0, 4)

  return (
    <div className="w-full flex items-center justify-center py-6 px-2">
      <div className="flex items-center">
        {allBooks.map((book, idx) => (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            aria-label={book.title}
            className="group relative cursor-pointer transition-transform duration-300 hover:-translate-y-4 hover:rotate-2 shrink-0"
            style={{ 
              zIndex: 10 - idx,
              marginInlineStart: idx === 0 ? '0' : '-4rem',
            }}
          >
            {/* Conteneur de l'image avec ombre et bordure légères */}
            <div className="relative w-28 sm:w-32 md:w-36 lg:w-44 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-white/20 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
              <Image
                src={normalizeImage(book.image)}
                alt={book.title}
                fill
                sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, (max-width: 1024px) 144px, 176px"
                className="object-cover"
                {...(idx === 0
                  ? { priority: true, fetchPriority: 'high' as const }
                  : { loading: 'lazy' as const, fetchPriority: 'auto' as const })}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
