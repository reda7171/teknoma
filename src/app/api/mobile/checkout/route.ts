import { NextResponse } from 'next/server'
import { getMobileCustomer } from '@/lib/mobile-auth'
import { readJsonBody } from '@/lib/request-body'
import { createOrder } from '@/lib/actions/orders'
import { prisma } from '@/lib/prisma'
import { publicOrderSelect } from '@/lib/public-order'

export async function POST(request: Request) {
  const customer = await getMobileCustomer(request)
  if (!customer) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  try {
    const body = await readJsonBody(request)
    const result = await createOrder(body as Parameters<typeof createOrder>[0], 'MOBILE_APP')
    if (!result.success || !result.orderId) return NextResponse.json(result, { status: 400 })
    const order = await prisma.order.update({
      where: { id: result.orderId }, data: { customerId: customer.id }, select: publicOrderSelect,
    })
    return NextResponse.json({ success: true, orderId: order.id, orderDetails: order }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Commande impossible' }, { status: 400 })
  }
}
