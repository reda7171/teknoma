import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> | { name: string } }
) {
  try {
    const resolvedParams = await params;
    const decodedName = decodeURIComponent(resolvedParams.name);

    const books = await prisma.book.findMany({
      where: {
        author: {
          contains: decodedName, // Using contains for partial matches if needed, but exact is fine too.
        },
      },
      select: {
        id: true,
        title: true,
        author: true,
        price: true,
        image: true,
        stock: true,
        language: true,
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // On formate les livres pour inclure le rating et le type
    const formattedBooks = books.map(book => {
      const avgRating = book.reviews.length > 0 
        ? book.reviews.reduce((acc, r) => acc + r.rating, 0) / book.reviews.length 
        : 0;
      
      const { reviews, ...bookData } = book;
      
      return {
        ...bookData,
        type: 'BOOK',
        rating: avgRating,
        reviewsCount: reviews.length
      };
    });

    // Optionnel : Récupérer d'autres auteurs similaires ou stats
    const stats = {
      totalBooks: formattedBooks.length,
      averageRating: formattedBooks.length > 0
        ? (formattedBooks.reduce((acc, book) => acc + (book.rating || 0), 0) / formattedBooks.length).toFixed(1)
        : '0.0'
    };

    return NextResponse.json({
      author: decodedName,
      stats,
      books: formattedBooks,
    });
  } catch (error) {
    console.error(`Error in /api/mobile/author/[name]:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
