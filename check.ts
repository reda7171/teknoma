import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.siteSettings.findMany({
        where: { key: { contains: 'n8n' } }
    })
    console.log(settings)

    await prisma.siteSettings.upsert({
        where: { key: 'n8n_webhook_url' },
        update: { value: 'http://n8n:5678/webhook/riwaya-publish' },
        create: { key: 'n8n_webhook_url', value: 'http://n8n:5678/webhook/riwaya-publish', category: 'config' }
    })
    console.log('n8n_webhook_url updated to http://n8n:5678/webhook/riwaya-publish')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
