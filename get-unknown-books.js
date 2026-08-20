const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function run() { 
    const books = await prisma.book.findMany({
        where: { author: 'Auteur inconnu' },
        select: { title: true }
    }); 
    
    console.log(books.map(b => '- ' + b.title).join('\n')); 
} 

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
