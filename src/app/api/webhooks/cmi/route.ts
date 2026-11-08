import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'
import { generateCMIHash } from '@/lib/cmi'

export async function POST(req: Request) {
    try {
        const formData = (await req.formData()) as any
        const params: Record<string, string> = {}

        if (typeof formData.forEach === 'function') {
            formData.forEach((value: any, key: string) => {
                params[key] = value?.toString() || ''
            })
        } else if (typeof formData.entries === 'function') {
            for (const [key, value] of formData.entries()) {
                params[key] = value?.toString() || ''
            }
        }

        const storeKey = await getSetting('payment_cmi_store_key')

        if (!storeKey) {
            return new NextResponse('CMI Store Key missing', { status: 500 })
        }

        // Validate Hash with timing-safe comparison
        const receivedHash = params['HASH'] || ''
        const calculatedHash = generateCMIHash(params, storeKey)

        const expectedBuffer = Buffer.from(calculatedHash)
        const suppliedBuffer = Buffer.from(receivedHash)
        if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
            console.error('CMI Webhook: Hash mismatch')
            return new NextResponse('Invalid Hash', { status: 400 })
        }

        const orderId = params['oid']
        const procReturnCode = params['ProcReturnCode']
        const responseCode = params['Response']

        if (!orderId) {
            return new NextResponse('Order ID missing', { status: 400 })
        }

        // CMI success conditions: ProcReturnCode === '00' and Response === 'Approved'
        if (procReturnCode === '00' && responseCode === 'Approved') {
            const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, paymentMethod: true } })
            const amount = Number(params.amount)
            if (!order || order.paymentMethod !== 'CMI' || params.currency !== '504' || !Number.isFinite(amount) || Math.round(amount * 100) !== Math.round(order.total * 100)) return new NextResponse('Payment mismatch', { status: 400 })
            await prisma.order.updateMany({ where: { id: orderId, status: 'PENDING', isPaid: false }, data: { status: 'CONFIRMED', isPaid: true } })
            // Return 'ACTION=POSTAUTH' as required by CMI docs to confirm receipt
            return new NextResponse('ACTION=POSTAUTH', { status: 200, headers: { 'Content-Type': 'text/plain' } })
        } else {
            // Payment failed or declined
            void(`CMI Payment failed for order ${orderId}: ${params['ErrMsg']}`)
            // Do not update order to CONFIRMED. Let it be PENDING_PAYMENT or update to FAILED (if we had such status).
            // Return ACK to stop CMI from retrying
            return new NextResponse('APPROVED', { status: 200, headers: { 'Content-Type': 'text/plain' } })
        }

    } catch (error: unknown) {
        console.error('CMI Webhook error:', error)
        return new NextResponse('Internal server error', { status: 500 })
    }
}
