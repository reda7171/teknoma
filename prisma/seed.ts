import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@petsunivers.ma'
  const password = process.env.ADMIN_INITIAL_PASSWORD
  if (!password || password.length < 12) throw new Error('ADMIN_INITIAL_PASSWORD : 12 caractères minimum requis.')
  await prisma.user.upsert({
    where: { email }, update: {},
    create: { email, password: await bcrypt.hash(password, 12), role: 'ADMIN', fullName: 'Admin PetsUnivers' },
  })
  for (const name of ['Chats', 'Chiens', 'Alimentation', 'Accessoires', 'Hygiène et soins', 'Petits animaux']) {
    await prisma.categoryConfig.upsert({ where: { name }, update: {}, create: { name } })
  }
  console.log('PetsUnivers initialisé : administrateur et catégories.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
