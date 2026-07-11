import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withyouService } from '@/lib/delivery/withyou'

// Maximum number of tracking IDs to sync at once
const BATCH_SIZE = 50

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const secret = searchParams.get('secret')
        
        // Security check
        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch orders that are shipped but not yet in a final state
        const activeOrders = await prisma.order.findMany({
            where: {
                trackingID: { not: null },
                status: {
                    notIn: ['DELIVERED', 'RETURNED', 'CANCELLED']
                },
                shippingCompany: { not: null }
            }
        })

        if (activeOrders.length === 0) {
            return NextResponse.json({ success: true, message: 'No active orders to sync', updatedCount: 0 })
        }

        const companies = await prisma.shippingCompany.findMany({
            where: {
                id: { in: Array.from(new Set(activeOrders.map(o => o.shippingCompany!))) }
            }
        })

        const companyMap = new Map(companies.map(c => [c.id, c.name.toLowerCase()]))
        
        let updatedCount = 0
        const errors = []

        const withYouOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('withyou')
        })

        const olivraisonOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('olivraison')
        })

        // Handle WithYou Bulk Sync
        if (withYouOrders.length > 0) {
            for (let i = 0; i < withYouOrders.length; i += BATCH_SIZE) {
                const batch = withYouOrders.slice(i, i + BATCH_SIZE)
                const trackingIds = batch.map(o => o.trackingID!).filter(Boolean)
                
                try {
                    const res = await withyouService.getStatus(trackingIds)
                    let statusArray = []
                    
                    if (Array.isArray(res)) {
                        statusArray = res
                    } else if (res?.data && Array.isArray(res.data)) {
                        statusArray = res.data
                    }
                    
                    for (const item of statusArray) {
                        const trackingID = item.trackingID || item.trackingId || item.code_tracking
                        const extStatus = item.status || item.statut
                        
                        if (trackingID && extStatus) {
                            const orderToUpdate = batch.find(o => o.trackingID === trackingID)
                            if (orderToUpdate && orderToUpdate.deliveryStatus !== extStatus) {
                                let newInternalStatus = orderToUpdate.status
                                const statusLower = extStatus.toLowerCase()
                                
                                if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                    newInternalStatus = 'DELIVERED'
                                } else if (statusLower.includes('retour') || statusLower.includes('returned')) {
                                    newInternalStatus = 'RETURNED'
                                } else if (statusLower.includes('annul') || statusLower.includes('cancel')) {
                                    newInternalStatus = 'CANCELLED'
                                }

                                await prisma.order.update({
                                    where: { id: orderToUpdate.id },
                                    data: {
                                        deliveryStatus: extStatus,
                                        deliverySyncAt: new Date(),
                                        status: newInternalStatus
                                    }
                                })
                                updatedCount++
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur sync bulk WithYou:', error)
                    errors.push('WithYou bulk sync failed')
                }
            }
        }

        // Handle Olivraison 
        if (olivraisonOrders.length > 0) {
            const defaultKey = await prisma.siteSettings.findUnique({ where: { key: 'olivraison_api_key' } })
            
            for (const order of olivraisonOrders) {
                try {
                    const comp = companies.find(c => c.id === order.shippingCompany)
                    const token = comp?.apiKey || defaultKey?.value
                    if (!token) continue

                    const res = await fetch(`http://partners.olivraison.com/package/${order.trackingID}`, {
                        headers: { 'authorization': `Bearer ${token}` }
                    })
                    
                    if (res.ok) {
                        const data = await res.json()
                        const extStatus = data.status
                        if (extStatus && extStatus !== order.deliveryStatus) {
                            let newInternalStatus = order.status
                            const statusLower = extStatus.toLowerCase()
                            
                            if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                newInternalStatus = 'DELIVERED'
                            } else if (statusLower.includes('retour') || statusLower.includes('returned')) {
                                newInternalStatus = 'RETURNED'
                            } else if (statusLower.includes('annul') || statusLower.includes('cancel')) {
                                newInternalStatus = 'CANCELLED'
                            }

                            await prisma.order.update({
                                where: { id: order.id },
                                data: {
                                    deliveryStatus: extStatus,
                                    deliverySyncAt: new Date(),
                                    status: newInternalStatus
                                }
                            })
                            updatedCount++
                        }
                    }
                } catch (err) {
                    console.error('Erreur API Olivraison', err)
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Sync complete`, 
            updatedCount,
            errors: errors.length > 0 ? errors : undefined
        })
        
    } catch (error: any) {
        console.error('CRON Sync Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
