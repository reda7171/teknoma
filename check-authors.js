const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Check how many authors exist
    const authors = await prisma.authorProfile.findMany();
    console.log('Author profiles in DB:', authors.length);
    
    // Actually, authors might not have AuthorProfile rows yet. 
    // Authors are usually just strings in `Book.author`.
    // Let's check unique authors in Books.
    const books = await prisma.book.findMany({ select: { author: true }});
    const uniqueAuthors = [...new Set(books.map(b => b.author))].filter(Boolean);
    console.log('Unique authors from Books:', uniqueAuthors.length);
    console.log('Sample:', uniqueAuthors.slice(0, 5));
}
main().finally(() => prisma.$disconnect());
