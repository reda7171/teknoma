const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBook() {
  const book = await prisma.book.findFirst({
    where: { title: { contains: 'تحت مسمى الرجولة' } }
  });

  if (book) {
    const seoText = "\n\nاحصل على النسخة الورقية الأصلية من كتاب تحت مسمى الرجولة لسارة علي بدل البحث عن قراءة بصيغة PDF غير قانونية.";
    
    // Only add if not already there
    if (!book.description.includes('PDF')) {
      await prisma.book.update({
        where: { id: book.id },
        data: { description: book.description + seoText }
      });
      console.log('Book updated successfully!');
    } else {
      console.log('Book already contains SEO text.');
    }
  } else {
    console.log('Book not found.');
  }
}

updateBook()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
