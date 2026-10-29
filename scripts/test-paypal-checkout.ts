import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import { validatePaypalOrder, type PaypalOrder } from '../src/lib/paypal-validation'

dotenv.config({ quiet: true })

async function main() {
    const { prisma } = await import('../src/lib/prisma')
    const { confirmPaypalPayment, paypalClient, syncPaypalRefund } = await import('../src/lib/paypal')
    const fixtureId = randomUUID()
    const base = 'http://localhost:3000'
    let checks = 0
    const checked = (label: string) => { checks++; console.log(`PASS ${label}`) }
    try {
        const client = await paypalClient()
        assert.equal(client.config.mode, 'sandbox', 'This test must never run in live mode')
        assert.equal(client.config.enabled, true)
        await prisma.order.create({ data: {
            id: fixtureId, fullName: 'PAYPAL AUTOMATED TEST', phone: '0600000000',
            address: 'Test only', city: 'Test', total: 100, paymentMethod: 'PAYPAL',
        } })
        const invalid = await fetch(`${base}/api/checkout/paypal`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
        })
        assert.equal(invalid.status, 400)
        checked('invalid request rejected')

        const start = () => fetch(`${base}/api/checkout/paypal`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' },
            body: JSON.stringify({ orderId: fixtureId }),
        })
        const created = await start()
        const result = await created.json()
        assert.equal(created.status, 200, JSON.stringify(result))
        assert.equal(new URL(result.url).hostname, 'www.sandbox.paypal.com')
        let payment = await prisma.paypalPayment.findUniqueOrThrow({ where: { orderId_mode: { orderId: fixtureId, mode: 'sandbox' } } })
        assert.ok(payment.amountUsd > 0)
        assert.equal(payment.amountMad, 10000)
        checked('real Sandbox order created with persisted conversion and approval URL')

        const repeated = await start()
        assert.equal(repeated.status, 200)
        assert.equal((await repeated.json()).url, result.url)
        assert.equal(await prisma.paypalPayment.count({ where: { orderId: fixtureId } }), 1)
        checked('checkout retry reuses the same PayPal order and amount')

        const remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${payment.paypalOrderId}`)
        validatePaypalOrder(remote, payment)
        // Inspect PayPal's stored return URL; an injected Origin must never be used.
        const full = remote as PaypalOrder & { payment_source?: { paypal?: { experience_context?: { return_url?: string } } }; application_context?: { return_url?: string } }
        const returnUrl = full.payment_source?.paypal?.experience_context?.return_url || full.application_context?.return_url
        if (returnUrl) assert.equal(new URL(returnUrl).hostname === 'untrusted.example', false)
        checked('PayPal stored references and USD amount match the local attempt')

        const returnReq = await fetch(`${base}/api/checkout/paypal/capture?orderId=${fixtureId}&token=${payment.paypalOrderId}`, { redirect: 'manual' })
        assert.equal(returnReq.status, 307)
        assert.ok(returnReq.headers.get('location')?.includes('paypal_capture_failed'))
        assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: fixtureId } })).isPaid, false)
        checked('unapproved Sandbox return cannot mark an order paid')

        const mismatched = await fetch(`${base}/api/checkout/paypal/capture?orderId=another-order&token=${payment.paypalOrderId}`, { redirect: 'manual' })
        assert.ok(mismatched.headers.get('location')?.includes('paypal_capture_failed'))
        checked('return with another merchant order rejected')

        const unsigned = await fetch(`${base}/api/webhooks/paypal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }) })
        assert.equal(unsigned.status, 400)
        const badJson = await fetch(`${base}/api/webhooks/paypal`, { method: 'POST', body: '{' })
        assert.equal(badJson.status, 400)
        checked('unsigned and malformed webhooks rejected')

        const unauthenticated = await fetch(`${base}/api/admin/paypal/test`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{}' })
        assert.equal(unauthenticated.status, 401)
        checked('admin diagnostics require authentication')

        // The following are isolated local simulations, NOT real captures.
        const completed: PaypalOrder = structuredClone(remote)
        completed.status = 'COMPLETED'
        completed.purchase_units![0].payments = { captures: [{ id: 'TEST' + Date.now(), status: 'COMPLETED', amount: { currency_code: 'USD', value: (payment.amountUsd / 100).toFixed(2) } }] }
        for (const mutation of [
            (o: PaypalOrder) => { o.id = 'OTHERORDER' },
            (o: PaypalOrder) => { o.purchase_units![0].reference_id = 'other' },
            (o: PaypalOrder) => { o.purchase_units![0].custom_id = 'other' },
            (o: PaypalOrder) => { o.purchase_units![0].amount.value = '0.01' },
            (o: PaypalOrder) => { o.purchase_units![0].amount.currency_code = 'EUR' },
            (o: PaypalOrder) => { o.purchase_units![0].payments!.captures![0].status = 'PENDING' },
            (o: PaypalOrder) => { o.purchase_units![0].payments!.captures![0].amount.value = '0.01' },
        ]) {
            const forged = structuredClone(completed); mutation(forged)
            assert.throws(() => validatePaypalOrder(forged, payment, true))
        }
        checked('wrong references, currency, amounts and pending captures rejected')

        await assert.rejects(() => confirmPaypalPayment(completed, 'live'))
        await prisma.order.update({ where: { id: fixtureId }, data: { total: 101 } })
        await assert.rejects(() => confirmPaypalPayment(completed, 'sandbox'))
        await prisma.order.update({ where: { id: fixtureId }, data: { total: 100, status: 'CANCELLED' } })
        await assert.rejects(() => confirmPaypalPayment(completed, 'sandbox'))
        await prisma.order.update({ where: { id: fixtureId }, data: { status: 'PENDING' } })
        checked('wrong environment, changed total and cancelled orders rejected')

        await confirmPaypalPayment(completed, 'sandbox')
        await confirmPaypalPayment(completed, 'sandbox')
        const paid = await prisma.order.findUniqueOrThrow({ where: { id: fixtureId } })
        assert.equal(paid.isPaid, true); assert.equal(paid.paidAmount, 100)
        assert.equal(paid.remainingAmount, 0); assert.equal(paid.status, 'CONFIRMED')
        payment = await prisma.paypalPayment.findUniqueOrThrow({ where: { id: payment.id } })
        assert.equal(payment.captureId, completed.purchase_units![0].payments!.captures![0].id)
        checked('simulated completed capture updates accounting once and tolerates replay')
        await prisma.order.update({ where: { id: fixtureId }, data: { status: 'SHIPPED' } })
        await confirmPaypalPayment(completed, 'sandbox')
        assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: fixtureId } })).status, 'SHIPPED')
        checked('replayed confirmation preserves shipping status')
        const refunded = structuredClone(completed)
        refunded.purchase_units![0].payments!.captures![0].status = 'REFUNDED'
        const capture = refunded.purchase_units![0].payments!.captures![0]
        let refundStatus = 'PARTIALLY_REFUNDED'
        const refundClient = { config: client.config, request: async <T>(path: string): Promise<T> => (
            path.startsWith('/v2/payments/captures/') ? {
                ...capture, status: refundStatus, supplementary_data: { related_ids: { order_id: payment.paypalOrderId } },
            } : refunded
        ) as T }
        await syncPaypalRefund(refundClient, capture.id)
        assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: fixtureId } })).isPaid, true)
        checked('partial refund does not mark the whole payment refunded')
        refundStatus = 'REFUNDED'
        await syncPaypalRefund(refundClient, capture.id)
        await syncPaypalRefund(refundClient, capture.id)
        const refundedOrder = await prisma.order.findUniqueOrThrow({ where: { id: fixtureId } })
        assert.equal(refundedOrder.isPaid, false); assert.equal(refundedOrder.paidAmount, 0)
        assert.equal(refundedOrder.status, 'SHIPPED')
        await assert.rejects(() => confirmPaypalPayment(completed, 'sandbox'))
        checked('full refund is idempotent, preserves delivery status and blocks late completion')
        await prisma.paypalPayment.update({ where: { id: payment.id }, data: { captureId: null, status: 'CREATED' } })
        await syncPaypalRefund(refundClient, capture.id)
        assert.equal((await prisma.paypalPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, 'REFUNDED')
        await assert.rejects(() => confirmPaypalPayment(completed, 'sandbox'))
        checked('refund received before completion is associated through the PayPal order')
        console.log(`${checks} checks passed. No buyer approval or real capture performed.`)
    } finally {
        await prisma.paypalPayment.deleteMany({ where: { orderId: fixtureId } })
        await prisma.order.deleteMany({ where: { id: fixtureId, fullName: 'PAYPAL AUTOMATED TEST' } })
        await prisma.$disconnect()
    }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
