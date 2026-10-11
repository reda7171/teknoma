const { randomUUID } = require('node:crypto')
const { PrismaClient, SalesChannel } = require('@prisma/client')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL est requis')

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
if (databaseName !== 'riwaya_multistore_test') {
    throw new Error(`Test refusé sur la base "${databaseName}"`)
}

const prisma = new PrismaClient()
const orderIds = [randomUUID(), randomUUID()]
const cartIds = [randomUUID(), randomUUID()]

async function main() {
    await prisma.order.create({
        data: {
            id: orderIds[0],
            fullName: 'Test Store',
            phone: '0600000001',
            address: 'Adresse de test',
            city: 'Rabat',
            total: 100
        }
    })

    await prisma.order.create({
        data: {
            id: orderIds[1],
            fullName: 'Test Riwaya MA',
            phone: '0600000002',
            address: 'Adresse de test',
            city: 'Casablanca',
            total: 150,
            salesChannel: SalesChannel.RIWAYA_MA
        }
    })

    await prisma.abandonedCart.create({
        data: { id: cartIds[0], cartData: '[]', total: 10 }
    })
    await prisma.abandonedCart.create({
        data: {
            id: cartIds[1],
            cartData: '[]',
            total: 20,
            salesChannel: SalesChannel.RIWAYA_MA
        }
    })

    const [orders, carts, orderIndexes, cartIndexes] = await Promise.all([
        prisma.order.findMany({ where: { id: { in: orderIds } }, select: { salesChannel: true } }),
        prisma.abandonedCart.findMany({ where: { id: { in: cartIds } }, select: { salesChannel: true } }),
        prisma.$queryRawUnsafe('SHOW INDEX FROM `orders` WHERE Key_name = \'orders_salesChannel_createdAt_idx\''),
        prisma.$queryRawUnsafe('SHOW INDEX FROM `abandoned_carts` WHERE Key_name = \'abandoned_carts_salesChannel_createdAt_idx\'')
    ])

    const orderChannels = new Set(orders.map(row => row.salesChannel))
    const cartChannels = new Set(carts.map(row => row.salesChannel))

    if (!orderChannels.has(SalesChannel.RIWAYA_STORE) || !orderChannels.has(SalesChannel.RIWAYA_MA)) {
        throw new Error('Canaux Order invalides')
    }
    if (!cartChannels.has(SalesChannel.RIWAYA_STORE) || !cartChannels.has(SalesChannel.RIWAYA_MA)) {
        throw new Error('Canaux AbandonedCart invalides')
    }
    if (orderIndexes.length < 2 || cartIndexes.length < 2) {
        throw new Error('Index composites salesChannel/createdAt absents')
    }

    console.log('OK: valeurs par défaut, RIWAYA_MA et index composites validés.')
}

main()
    .finally(async () => {
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
        await prisma.abandonedCart.deleteMany({ where: { id: { in: cartIds } } }).catch(() => undefined)
        await prisma.$disconnect()
    })
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
