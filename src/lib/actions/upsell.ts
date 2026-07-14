'use server'

import { getBookById } from '@/lib/db/books'

export async function getBookmarksUpsell() {
    try {
        const bookmarksId = 'aa1a8fae-5d90-415a-a8ed-bb83ee18db53';
        const book = await getBookById(bookmarksId);
        
        if (!book || !book.active || book.stock <= 0) {
            return null;
        }
        
        return {
            id: book.id,
            title: book.title,
            titleAr: book.titleAr,
            titleEn: book.titleEn,
            price: book.price,
            image: book.image,
            author: book.author,
        };
    } catch (error) {
        console.error('Error fetching bookmarks upsell:', error);
        return null;
    }
}
