import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.siteSettings.upsert({
    where: { key: 'contact_phone' },
    update: { value: '+212 769-686055' },
    create: {
      key: 'contact_phone',
      value: '+212 769-686055',
      category: 'contact',
      description: 'WhatsApp / Téléphone officiel'
    }
  })

  await prisma.siteSettings.upsert({
    where: { key: 'contact_whatsapp' },
    update: { value: '212769686055' },
    create: {
      key: 'contact_whatsapp',
      value: '212769686055',
      category: 'contact',
      description: 'Numéro WhatsApp principal'
    }
  })

  await prisma.siteSettings.upsert({
    where: { key: 'whatsapp_agents' },
    update: {
      value: JSON.stringify([
        { id: 'support', name: 'Support Tekno', phone: '212769686055', enabled: true, priority: 1 }
      ])
    },
    create: {
      key: 'whatsapp_agents',
      value: JSON.stringify([
        { id: 'support', name: 'Support Tekno', phone: '212769686055', enabled: true, priority: 1 }
      ]),
      category: 'whatsapp',
      description: 'Agents WhatsApp'
    }
  })

  console.log('SiteSettings updated with +212 769-686055 successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
