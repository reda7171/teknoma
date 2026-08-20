const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const authors = await prisma.authorProfile.findMany({
        select: { name: true, bio: true }
    });

    // Bios courtes : moins de 100 caractères
    const short = authors.filter(a => a.bio && a.bio.trim().length < 100);
    
    short.forEach(a => {
        console.log(`${a.name} :\n  "${a.bio}"\n`);
    });
    
    console.log(`Total : ${short.length} auteurs avec bio courte`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
