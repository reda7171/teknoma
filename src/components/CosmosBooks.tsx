'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { normalizeImage } from '@/lib/utils'

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
  locale: string
  autoRotateCenter?: boolean
  autoRotateInterval?: number
}

export default function CosmosBooks({
  books,
  centerBook,
  locale,
}: CosmosBooksProps) {
  const router = useRouter()
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = (id: string) => {
    setFailedImages(prev => new Set(prev).add(id))
  }

  const handleClick = (book: OrbitBook) => {
    router.push(`/${locale}/books/${book.id}`)
  }

  const allBooks = [centerBook, ...books.filter(b => b.id !== centerBook.id)].slice(0, 4)

  return (
    <div className="w-full flex items-center justify-center py-6 px-2">
      <div className="flex items-center">
        {allBooks.map((book, idx) => (
          <div
            key={book.id}
            onClick={() => handleClick(book)}
            className="group relative cursor-pointer transition-transform duration-300 hover:-translate-y-4 hover:rotate-2 shrink-0"
            style={{ 
              zIndex: 10 - idx,
              marginInlineStart: idx === 0 ? '0' : '-4rem',
            }}
          >
            {/* Conteneur de l'image avec ombre et bordure légères */}
            <div className="relative w-28 sm:w-32 md:w-36 lg:w-44 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-white/20 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
              {failedImages.has(book.id) ? (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center p-4 text-center">
                  <span className="text-xs font-black text-gray-700 line-clamp-3">{book.title}</span>
                </div>
              ) : (
                <Image
                  src={normalizeImage(book.image)}
                  alt={book.title}
                  fill
                  sizes="(max-width: 768px) 30vw, (max-width: 1200px) 20vw, 15vw"
                  className="object-cover"
                  onError={() => handleImageError(book.id)}
                  {...(idx === 0
                    ? { preload: true }
                    : { loading: 'eager' as const, fetchPriority: 'high' as const })}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
