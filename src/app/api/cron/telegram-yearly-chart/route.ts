import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { sendTelegramDocument } from '@/lib/telegram'
import { prisma } from '@/lib/prisma'
import PdfPrinter from 'pdfmake'

export const maxDuration = 60 // Allow longer execution time if fetching many pages

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const expectedToken = process.env.CRON_SECRET?.replace(/^["']|["']$/g, '')
        if (url.searchParams.get('token') !== expectedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return NextResponse.json({ error: 'Jumia non configuré' }, { status: 400 })

        const now = new Date()
        const currentMonthIndex = now.getMonth()
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]

        // Fetch Jumia Orders
        let allOrders: any[] = []
        let hasMore = true
        let nextToken: string | undefined = undefined
        while (hasMore) {
            const response = await jumia.getOrders(100, nextToken, undefined, yearStart, yearEnd)
            const orders = response?.orders || response?.data?.orders || []
            allOrders = allOrders.concat(orders)
            nextToken = response?.nextPageToken || response?.data?.nextPageToken
            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
        }

        const monthlyRevenue = Array(12).fill(0)
        const monthlyTotalOrders = Array(12).fill(0)
        const monthlyCanceledOrders = Array(12).fill(0)
        
        let jumiaOrdersCurrentMonth = 0
        let jumiaRevenueCurrentMonth = 0
        let jumiaCanceledCurrentMonth = 0

        allOrders.forEach(o => {
            if (o.createdAt && o.status) {
                const month = new Date(o.createdAt).getMonth()
                monthlyTotalOrders[month]++
                
                const isCanceled = o.status.toUpperCase() === 'CANCELED'
                const isReturned = o.status.toUpperCase() === 'RETURNED'
                let amount = 0
                
                if (isCanceled) {
                    monthlyCanceledOrders[month]++
                } else if (!isReturned) {
                    amount = parseFloat(o.totalAmountLocal?.value || '0')
                    monthlyRevenue[month] += amount
                }

                if (month === currentMonthIndex) {
                    jumiaOrdersCurrentMonth++
                    if (isCanceled) jumiaCanceledCurrentMonth++
                    if (!isCanceled && !isReturned) jumiaRevenueCurrentMonth += amount
                }
            }
        })

        const cancellationRate = monthlyTotalOrders.map((total, i) => total > 0 ? Math.round((monthlyCanceledOrders[i] / total) * 100) : 0)
        const cancelRateMonth = jumiaOrdersCurrentMonth > 0 ? Math.round((jumiaCanceledCurrentMonth / jumiaOrdersCurrentMonth) * 100) : 0

        // Fetch Store Orders
        const storeOrders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: new Date(yearStart),
                    lte: new Date(yearEnd + 'T23:59:59Z')
                }
            },
            select: { total: true, createdAt: true, status: true }
        })

        const monthlyStoreRevenue = Array(12).fill(0)
        let storeOrdersCurrentMonth = 0
        let storeRevenueCurrentMonth = 0

        storeOrders.forEach(o => {
            if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') {
                const month = o.createdAt.getMonth()
                monthlyStoreRevenue[month] += o.total
                if (month === currentMonthIndex) {
                    storeOrdersCurrentMonth++
                    storeRevenueCurrentMonth += o.total
                }
            }
        })

        // Chart 1
        const chartConfig1 = {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                datasets: [
                    { type: 'line', label: 'Taux Annulation (%)', data: cancellationRate, borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 2, fill: false, yAxisID: 'y1' },
                    { type: 'bar', label: 'CA Net (MAD)', data: monthlyRevenue.map(v => Math.round(v)), backgroundColor: 'rgba(255, 153, 0, 0.8)', borderRadius: 4, yAxisID: 'y' }
                ]
            },
            options: {
                plugins: { title: { display: true, text: `Évolution CA Jumia & Annulations - ${now.getFullYear()}` } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left' },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100 }
                }
            }
        }
        const chartUrl1 = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig1))}`

        // Chart 2
        const chartConfig2 = {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                datasets: [
                    { label: 'Boutique (MAD)', data: monthlyStoreRevenue.map(v => Math.round(v)), backgroundColor: 'rgba(54, 162, 235, 0.8)', borderRadius: 4 },
                    { label: 'Jumia (MAD)', data: monthlyRevenue.map(v => Math.round(v)), backgroundColor: 'rgba(255, 153, 0, 0.8)', borderRadius: 4 }
                ]
            },
            options: { plugins: { title: { display: true, text: `Comparatif Jumia vs Boutique - ${now.getFullYear()}` } } }
        }
        const chartUrl2 = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig2))}`

        // Fetch Images
        const [res1, res2] = await Promise.all([fetch(chartUrl1), fetch(chartUrl2)])
        const [buf1, buf2] = await Promise.all([res1.arrayBuffer(), res2.arrayBuffer()])
        const img1 = `data:image/png;base64,${Buffer.from(buf1).toString('base64')}`
        const img2 = `data:image/png;base64,${Buffer.from(buf2).toString('base64')}`

        // Generate PDF
        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        }
        const printer = new PdfPrinter(fonts)
        const docDef: any = {
            content: [
                { text: 'Rapport Mensuel Consolidé - Riwaya', style: 'header' },
                { text: `Généré le ${new Date().toLocaleString('fr-FR')} pour le mois de ${now.toLocaleString('fr-FR', { month: 'long' })}`, margin: [0, 0, 0, 20] },
                { text: 'KPIs Principaux (Mois en cours)', style: 'subheader' },
                {
                    ul: [
                        `Chiffre d'Affaires Net Jumia : ${jumiaRevenueCurrentMonth.toFixed(2)} MAD (${jumiaOrdersCurrentMonth} commandes)`,
                        `Chiffre d'Affaires Net Boutique : ${storeRevenueCurrentMonth.toFixed(2)} MAD (${storeOrdersCurrentMonth} commandes)`,
                        `Taux d'annulation (Jumia) : ${cancelRateMonth}% (${jumiaCanceledCurrentMonth} annulations)`
                    ]
                },
                { text: 'Évolution du CA Jumia et Annulations', style: 'subheader', margin: [0, 20, 0, 10] },
                { image: img1, width: 500 },
                { text: 'Comparatif Jumia vs Boutique', style: 'subheader', margin: [0, 20, 0, 10] },
                { image: img2, width: 500 }
            ],
            styles: {
                header: { fontSize: 22, bold: true },
                subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] }
            },
            defaultStyle: { font: 'Roboto' }
        }

        const pdfDoc = printer.createPdfKitDocument(docDef)
        const chunks: Buffer[] = []
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
        await new Promise((resolve) => {
            pdfDoc.on('end', () => resolve(null))
            pdfDoc.end()
        })
        const pdfBuffer = Buffer.concat(chunks)
        
        await sendTelegramDocument(pdfBuffer, `Rapport_Riwaya_${now.getFullYear()}_${now.getMonth()+1}.pdf`, `📊 <b>Rapport Automatique Mensuel</b>\n📈 Voici votre rapport consolidé incluant les KPIs et graphiques de ce mois.`)

        return NextResponse.json({ success: true, message: 'Rapport PDF généré et envoyé' })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
