import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  void('Initializing displayOrder for all books...')
  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' }
  })

  for (let i = 0; i < books.length; i++) {
    await prisma.book.update({
      where: { id: books[i].id },
      data: { displayOrder: i }
    })
  }
  void(`Done! ${books.length} books updated.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
