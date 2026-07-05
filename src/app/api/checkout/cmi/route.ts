import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'
import { generateCMIHash } from '@/lib/cmi'

export async function POST(req: Request) {
    try {
        const clientId = await getSetting('payment_cmi_client_id')
        const storeKey = await getSetting('payment_cmi_store_key')
        const mode = await getSetting('payment_cmi_mode') || 'test'
        
        if (!clientId || !storeKey) {
            return NextResponse.json({ error: 'CMI is not configured' }, { status: 500 })
        }

        const gatewayUrl = mode === 'live' 
            ? 'https://payment.cmi.co.ma/ficap/sps/pay' 
            : 'https://testpayment.cmi.co.ma/ficap/sps/pay'

        const body = await req.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

        // CMI Required Parameters
        const params: Record<string, string> = {
            clientid: clientId,
            amount: order.total.toFixed(2), // Total amount
            oid: order.id, // Order ID
            okUrl: `${origin}/checkout/success/${order.id}`,
            failUrl: `${origin}/checkout?error=cmi_failed`,
            callbackUrl: `${origin}/api/webhooks/cmi`,
            TranType: 'PreAuth',
            currency: '504', // 504 is MAD (Moroccan Dirham)
            rnd: Date.now().toString(),
            storetype: '3d_pay_hosting',
            hashAlgorithm: 'ver3',
            lang: 'fr',
            email: order.email || 'client@riwaya.store',
            BillToName: order.fullName,
            BillToCompany: '',
            BillToStreet1: order.address,
            BillToCity: order.city,
            BillToStateProv: '',
            BillToPostalCode: '',
            BillToCountry: 'MA',
            tel: order.phone,
        }

        // Generate Hash
        const hash = generateCMIHash(params, storeKey)
        params['HASH'] = hash
        params['encoding'] = 'UTF-8'

        // Generate HTML form
        let formHtml = `<form id="cmi_form" method="post" action="${gatewayUrl}">`
        for (const [key, value] of Object.entries(params)) {
            formHtml += `<input type="hidden" name="${key}" value="${value}" />`
        }
        formHtml += `</form>`

        return NextResponse.json({ formHtml })

    } catch (error: any) {
        console.error('CMI Checkout error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
