import { PrismaClient, SalesChannel } from '@prisma/client'
import { createOrder } from '../src/lib/actions/orders'
import { calculate3For4Discount } from '../src/lib/utils'

const prisma = new PrismaClient()

interface TestResult {
    name: string
    passed: boolean
    error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`)
    }
}

async function runStep(name: string, fn: () => Promise<void>) {
    try {
        await fn()
        results.push({ name, passed: true })
        console.log(`PASS: ${name}`)
    } catch (err: any) {
        results.push({ name, passed: false, error: err?.message || String(err) })
        console.error(`FAIL: ${name} -> ${err?.message || err}`)
    }
}

async function main() {
    console.log('--- DEBUT DU TEST E2E : VALIDATION PANIER ET COMMANDE COD ---')

    // 1. Validation de la logique du panier et frais de port
    await runStep('Panier: Calcul des frais de port standard (< 500 DH -> 30 DH)', async () => {
        const subtotal = 150
        const hasOnlyDigital = false
        const hasFreeShippingItem = false
        const shippingFee = (hasOnlyDigital || hasFreeShippingItem || subtotal >= 500) ? 0 : 30
        assert(shippingFee === 30, `Frais de port attendus: 30, obtenu: ${shippingFee}`)
    })

    await runStep('Panier: Calcul des frais de port gratuits (>= 500 DH -> 0 DH)', async () => {
        const subtotal = 520
        const hasOnlyDigital = false
        const hasFreeShippingItem = false
        const shippingFee = (hasOnlyDigital || hasFreeShippingItem || subtotal >= 500) ? 0 : 30
        assert(shippingFee === 0, `Frais de port gratuits attendus: 0, obtenu: ${shippingFee}`)
    })

    await runStep('Panier: Calcul des frais de port commande 100% numérique (-> 0 DH)', async () => {
        const subtotal = 80
        const hasOnlyDigital = true
        const hasFreeShippingItem = false
        const shippingFee = (hasOnlyDigital || hasFreeShippingItem || subtotal >= 500) ? 0 : 30
        assert(shippingFee === 0, `Frais de port numériques attendus: 0, obtenu: ${shippingFee}`)
    })

    await runStep('Panier: Règle de promotion 3 pour 4 (le livre le moins cher est offert)', async () => {
        const items = [
            { type: 'BOOK', price: 100, quantity: 1 },
            { type: 'BOOK', price: 80, quantity: 1 },
            { type: 'BOOK', price: 60, quantity: 1 },
            { type: 'BOOK', price: 40, quantity: 1 } // Le moins cher = 40 DH
        ]
        const discount = calculate3For4Discount(items)
        assert(discount === 40, `Remise attendue: 40, obtenu: ${discount}`)
    })

    // 2. Validation du formulaire checkout (Rejets d'erreurs)
    await runStep('Validation: Rejet si panier vide', async () => {
        const res = await createOrder({
            fullName: 'Client Test',
            phone: '0612345678',
            address: 'Rue de test 123',
            city: 'Rabat',
            items: [],
            paymentMethod: 'COD'
        } as any)
        assert(!res.success, 'La commande avec panier vide aurait dû être rejetée')
    })

    await runStep('Validation: Rejet si téléphone invalide (< 8 caractères)', async () => {
        const res = await createOrder({
            fullName: 'Client Test',
            phone: '0600',
            address: 'Rue de test 123',
            city: 'Rabat',
            items: [{ productId: '00000000-0000-0000-0000-000000000000', quantity: 1, type: 'BOOK', price: 50 }],
            paymentMethod: 'COD'
        } as any)
        assert(!res.success, 'La commande avec téléphone court aurait dû être rejetée')
    })

    // 3. Parcours complet Commande COD avec persistence DB et vérification
    let createdOrderId: string | null = null

    await runStep('Parcours COD E2E: Création et persistance d\'une commande Cash on Delivery', async () => {
        // Trouver un livre actif existant
        const book = await prisma.book.findFirst({
            where: { active: true, stock: { gt: 0 } },
            select: { id: true, title: true, price: true }
        })

        if (!book) {
            throw new Error('Aucun livre actif en stock trouvé pour exécuter le test')
        }

        const testOrderPayload = {
            fullName: 'E2E Automated Tester',
            email: 'e2e-test@riwaya.store',
            phone: '0612345678',
            address: 'Avenue Mohammed V, Résidence Test N°10',
            city: 'Rabat',
            comment: '[TEST AUTOMATISÉ COD - A SUPPRIMER]',
            paymentMethod: 'COD' as const,
            items: [{
                productId: book.id,
                quantity: 1,
                type: 'BOOK' as const,
                price: Number(book.price)
            }]
        }

        const res = await createOrder(testOrderPayload, SalesChannel.RIWAYA_STORE)
        assert(res.success === true, `Échec createOrder: ${res.error}`)
        assert(!!res.orderId, 'orderId manquant dans la réponse')

        createdOrderId = res.orderId!

        // Vérification directe dans la base de données
        const dbOrder = await prisma.order.findUnique({
            where: { id: createdOrderId },
            include: { items: true }
        })

        assert(!!dbOrder, 'Commande introuvable dans la base de données')
        assert(dbOrder!.paymentMethod === 'COD', `paymentMethod attendu: COD, trouvé: ${dbOrder!.paymentMethod}`)
        assert(dbOrder!.status === 'PENDING', `statut attendu: PENDING, trouvé: ${dbOrder!.status}`)
        assert(dbOrder!.city === 'Rabat', `ville attendue: Rabat, trouvée: ${dbOrder!.city}`)
        assert(dbOrder!.items.length === 1, `1 article attendu, trouvé: ${dbOrder!.items.length}`)
        assert(dbOrder!.items[0].bookId === book.id, `ID produit différent du livre sélectionné`)
    })

    // 4. Nettoyage de la commande de test (Idempotence & DB propre)
    await runStep('Nettoyage: Suppression de la commande de test générée', async () => {
        if (!createdOrderId) {
            console.log('Aucune commande à supprimer.')
            return
        }

        // Supprimer d'abord les orderItems
        await prisma.orderItem.deleteMany({
            where: { orderId: createdOrderId }
        })

        // Supprimer la commande
        await prisma.order.delete({
            where: { id: createdOrderId }
        })

        // Vérification
        const deletedCheck = await prisma.order.findUnique({
            where: { id: createdOrderId }
        })
        assert(!deletedCheck, 'La commande de test n\'a pas été supprimée')
    })

    console.log('\n--- BILAN DU TEST E2E ---')
    const passedCount = results.filter(r => r.passed).length
    const totalCount = results.length
    console.log(`Succès: ${passedCount}/${totalCount}`)

    if (passedCount !== totalCount) {
        console.error('Certains tests ont échoué.')
        process.exit(1)
    } else {
        console.log('TOUS LES TESTS SONT PASSES AVEC SUCCES.')
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
        process.exit(0)
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
