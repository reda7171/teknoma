import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger',
  'Agadir', 'Oujda', 'Meknès', 'Kenitra', 'Tétouan'
]

async function main() {
  console.log('Starting seed exchanges...')

  // Create 2 test users if they don't exist
  const users = []
  for (let i = 1; i <= 2; i++) {
    const email = `exchanger${i}@riwaya.store`
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('password123', 10),
          fullName: `Utilisateur Échangeur ${i}`,
          role: 'USER',
          city: CITIES[Math.floor(Math.random() * CITIES.length)],
        }
      })
    }
    users.push(user)
  }

  const user1 = users[0]
  const user2 = users[1]

  // Add more test users to populate different cities on the map
  const mapUsers = []
  for (let i = 1; i <= 8; i++) {
    const email = `mapuser${i}@riwaya.store`
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('password123', 10),
          fullName: `Lecteur ${CITIES[i]}`,
          role: 'USER',
          city: CITIES[i], // Spread across different cities
        }
      })
    }
    mapUsers.push(user)
  }

  // Create some ExchangeBooks
  console.log('Creating ExchangeBooks...')
  const booksToCreate = [
    { title: 'L\'Étranger', author: 'Albert Camus', cityUser: mapUsers[0] },
    { title: '1984', author: 'George Orwell', cityUser: mapUsers[1] },
    { title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', cityUser: mapUsers[2] },
    { title: 'Les Misérables', author: 'Victor Hugo', cityUser: mapUsers[3] },
    { title: 'L\'Alchimiste', author: 'Paulo Coelho', cityUser: mapUsers[4] },
    { title: 'Sapiens', author: 'Yuval Noah Harari', cityUser: mapUsers[5] },
    { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', cityUser: mapUsers[6] },
    { title: 'Atomic Habits', author: 'James Clear', cityUser: mapUsers[7] },
    { title: 'The Power of Habit', author: 'Charles Duhigg', cityUser: user1 },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', cityUser: user2 },
  ]

  const createdBooks = []
  for (const book of booksToCreate) {
    const createdBook = await prisma.exchangeBook.create({
      data: {
        title: book.title,
        author: book.author,
        ownerId: book.cityUser.id,
        condition: 'GOOD',
        description: 'En très bon état, lu une seule fois.',
        exchangeType: 'DIRECT',
        status: 'AVAILABLE'
      }
    })
    createdBooks.push(createdBook)
  }

  console.log('Creating Exchanges...')
  
  // 1. Pending exchange
  await prisma.exchange.create({
    data: {
      requesterId: user1.id,
      responderId: user2.id,
      bookRequestedId: createdBooks[9].id,
      bookOfferedId: createdBooks[8].id,
      status: 'PENDING',
      message: 'Bonjour, je suis intéressé par votre livre en échange du mien.'
    }
  })

  // 2. Accepted exchange
  await prisma.exchange.create({
    data: {
      requesterId: user2.id,
      responderId: mapUsers[0].id,
      bookRequestedId: createdBooks[0].id,
      bookOfferedId: createdBooks[9].id,
      status: 'ACCEPTED',
      message: 'Super ! Rencontrons-nous au centre-ville.'
    }
  })

  // 3. Completed exchange
  await prisma.exchange.create({
    data: {
      requesterId: mapUsers[1].id,
      responderId: mapUsers[2].id,
      bookRequestedId: createdBooks[2].id,
      bookOfferedId: createdBooks[1].id,
      status: 'COMPLETED',
      message: 'Échange parfait, merci !'
    }
  })

  console.log('Seed exchanges completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
