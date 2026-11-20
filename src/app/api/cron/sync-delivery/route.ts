import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withyouService } from '@/lib/delivery/withyou'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

// Maximum number of tracking IDs to sync at once
const BATCH_SIZE = 50

export async function GET(request: Request) {
    try {
        if (!isAuthorizedCronRequest(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch orders with tracking numbers that are not finalized
        const activeOrders = await prisma.order.findMany({
            where: {
                trackingID: { not: null },
                shippingCompany: { not: null },
                OR: [
                    { status: { notIn: ['DELIVERED'] } },
                    { deliveryStatus: null },
                    { deliveryStatus: { notIn: ['Livrer', 'Livre', 'Livré', 'DELIVERED'] } }
                ]
            }
        })

        if (activeOrders.length === 0) {
            await prisma.cronLog.create({
                data: {
                    jobName: "sync-delivery",
                    status: "SUCCESS",
                    message: "Aucune commande à synchroniser",
                }
            })
            return NextResponse.json({ success: true, message: 'No orders to sync', updatedCount: 0 })
        }

        const companies = await prisma.shippingCompany.findMany({
            where: {
                id: { in: Array.from(new Set(activeOrders.map(o => o.shippingCompany!))) }
            }
        })

        const companyMap = new Map(companies.map(c => [c.id, c.name.toLowerCase()]))
        
        let updatedCount = 0
        let inspectedCount = 0
        const errors: string[] = []

        const withYouOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('withyou')
        })

        const olivraisonOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('olivraison')
        })

        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim())

        // Handle WithYou Bulk Sync
        if (withYouOrders.length > 0) {
            for (let i = 0; i < withYouOrders.length; i += BATCH_SIZE) {
                const batch = withYouOrders.slice(i, i + BATCH_SIZE)
                const trackingIds = batch.map(o => o.trackingID!).filter(id => Boolean(id) && !isUuid(id))
                if (trackingIds.length === 0) continue
                
                try {
                    const res = await withyouService.getStatus(trackingIds)
                    let statusArray: any[] = []
                    
                    if (Array.isArray(res)) {
                        statusArray = res
                    } else if (res?.data && Array.isArray(res.data)) {
                        statusArray = res.data
                    }
                    
                    for (const item of statusArray) {
                        const rawTrackingID = item.id || item.code_tracking || item.codetracking || item.trackingID || item.trackingId || item.numero
                        const trackingID = rawTrackingID == null ? '' : String(rawTrackingID).trim()
                        const extStatusRaw = item.status || item.statut
                        let extStatus = ''
                        if (typeof extStatusRaw === 'object' && extStatusRaw !== null) {
                            extStatus = extStatusRaw.code || extStatusRaw.label || extStatusRaw.statut || JSON.stringify(extStatusRaw)
                        } else {
                            extStatus = String(extStatusRaw || '').trim()
                        }
                        
                        if (trackingID && extStatus) {
                            const orderToUpdate = batch.find(o => String(o.trackingID).trim() === trackingID)
                            if (orderToUpdate) {
                                inspectedCount++
                                let newInternalStatus = orderToUpdate.status
                                const statusLower = extStatus.toLowerCase()
                                
                                if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                    newInternalStatus = 'DELIVERED'
                                } else if (statusLower.includes('retour') || statusLower.includes('returned') || statusLower.includes('refus')) {
                                    newInternalStatus = 'RETURNED'
                                } else if (statusLower.includes('annul') || statusLower.includes('cancel') || statusLower.includes('interess')) {
                                    newInternalStatus = 'CANCELLED'
                                } else if (statusLower.includes('expedi') || statusLower.includes('shipped') || (statusLower.includes('ramass') && !statusLower.includes('attente'))) {
                                    newInternalStatus = 'SHIPPED'
                                } else if (statusLower.includes('transit') || statusLower.includes('chemin') || statusLower.includes('report') || statusLower.includes('programm') || statusLower.includes('reponse') || statusLower.includes('injoignable')) {
                                    newInternalStatus = 'IN_TRANSIT'
                                }

                                if (orderToUpdate.deliveryStatus !== extStatus || orderToUpdate.status !== newInternalStatus) {
                                    await prisma.order.update({
                                        where: { id: orderToUpdate.id },
                                        data: {
                                            deliveryStatus: extStatus,
                                            deliverySyncAt: new Date(),
                                            status: newInternalStatus
                                        }
                                    })
                                    updatedCount++

                                    if (newInternalStatus !== orderToUpdate.status && (newInternalStatus === 'SHIPPED' || newInternalStatus === 'DELIVERED')) {
                                        sendWhatsAppNotification({
                                            orderId: orderToUpdate.id,
                                            fullName: orderToUpdate.fullName,
                                            phone: orderToUpdate.phone,
                                            status: newInternalStatus,
                                            trackingID: trackingID,
                                            shippingCompanyName: 'WithYou'
                                        }).catch(console.error)
                                    }
                                }
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('Erreur sync bulk WithYou:', error)
                    errors.push(`WithYou: ${error.message}`)
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
                        inspectedCount++
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
                } catch (err: any) {
                    console.error('Erreur API Olivraison', err)
                    errors.push(`Olivraison: ${err.message}`)
                }
            }
        }

        if (updatedCount > 0) {
            revalidatePath('/[locale]/admin/orders', 'page')
            revalidatePath('/fr/admin/orders')
            revalidatePath('/ar/admin/orders')
            revalidatePath('/en/admin/orders')
            revalidatePath('/admin/orders')
        }

        await prisma.cronLog.create({
            data: {
                jobName: "sync-delivery",
                status: errors.length > 0 ? "WARNING" : "SUCCESS",
                message: `CRON WithYou terminé: ${inspectedCount} colis vérifiés, ${updatedCount} commandes mises à jour.`,
                details: { inspectedCount, updatedCount, errors: errors.length > 0 ? errors : undefined }
            }
        })

        return NextResponse.json({ 
            success: true, 
            message: `Sync complete`, 
            inspectedCount,
            updatedCount,
            errors: errors.length > 0 ? errors : undefined
        })
        
    } catch (error: any) {
        console.error('CRON Sync Error:', error)
        
        await prisma.cronLog.create({
            data: {
                jobName: "sync-delivery",
                status: "ERROR",
                message: error.message || "Erreur lors de la synchro livraison",
                details: { stack: error.stack }
            }
        }).catch(e => console.error("Erreur log cron:", e))

        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
