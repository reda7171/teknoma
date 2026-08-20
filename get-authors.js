const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function run() { 
    const bookStats = await prisma.book.groupBy({ 
        by: ['author'], 
        _count: { _all: true }
    }); 
    
    bookStats.sort((a,b) => b._count._all - a._count._all); 
    
    console.log(bookStats.map(s => s.author + ' (' + s._count._all + ')').join('\n')); 
} 

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
