import { prisma } from './src/lib/prisma';

async function checkImages() {
  const book = await prisma.book.findFirst({ select: { image: true } });
  const pack = await prisma.pack.findFirst({ select: { image: true } });
  
  console.log('Book image sample:', book?.image?.substring(0, 300));
  console.log('Pack image sample:', pack?.image?.substring(0, 300));
  
  await prisma.$disconnect();
}

checkImages().catch(console.error);
