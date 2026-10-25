'use client'

import { FileSpreadsheet } from 'lucide-react'

interface ExportOrdersButtonProps {
    orders: any[]
}

const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    SHIPPED: 'Expédiée',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
    RETURNED: 'Retournée',
    IN_TRANSIT: 'En transit',
    AWAITING_PAYMENT: 'Paiement en attente'
}

/**
 * Export Excel (.xls) natif avec colonnes formatées, styles et support UTF-8 (Arabe/Français)
 */
export default function ExportOrdersButton({ orders }: ExportOrdersButtonProps) {
    const handleExport = () => {
        const headers = [
            'N° Commande', 'Date & Heure', 'Canal', 'Statut', 'Client', 'Téléphone',
            'Ville', 'Adresse Complète', 'Article / Titre', 'Type', 'Quantité',
            'Prix Unitaire (MAD)', 'Total Article (MAD)', 'Remise (MAD)', 'Code Promo',
            'Total Commande (MAD)', 'Transporteur', 'N° Suivi', 'Commentaire Client'
        ]

        let tableRows = ''

        orders.forEach((order) => {
            const items = order.items || []
            const firstItemOnly = items.length === 0 ? [{}] : items

            firstItemOnly.forEach((item: any, index: number) => {
                const isFirstRow = index === 0
                const itemTitle = item.type === 'BOOK'
                    ? (item.book?.title || 'Livre')
                    : item.type === 'PACK'
                    ? (item.pack?.name || 'Pack')
                    : (item.extraProduct?.name || 'Article')

                const statusLabel = statusLabels[order.status] || order.status || '-'
                const dateFormatted = new Date(order.createdAt).toLocaleString('fr-FR', {
                    timeZone: 'Africa/Casablanca',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })

                tableRows += `
                <tr>
                    <td style="mso-number-format:'\\@'; text-align: center; font-weight: bold;">#${order.id.slice(0, 8)}</td>
                    <td style="mso-number-format:'\\@';">${dateFormatted}</td>
                    <td style="text-align: center;">${order.salesChannel || 'RIWAYA_STORE'}</td>
                    <td style="text-align: center; font-weight: bold;">${statusLabel}</td>
                    <td>${order.fullName || '-'}</td>
                    <td style="mso-number-format:'\\@'; text-align: center;">${order.phone || '-'}</td>
                    <td>${order.city || '-'}</td>
                    <td>${order.address || '-'}</td>
                    <td>${itemTitle}</td>
                    <td style="text-align: center;">${item.type || '-'}</td>
                    <td style="text-align: center; mso-number-format:'0';">${item.quantity || 1}</td>
                    <td style="text-align: right; mso-number-format:'0.00';">${item.price ? Number(item.price).toFixed(2) : '0.00'}</td>
                    <td style="text-align: right; mso-number-format:'0.00';">${item.price && item.quantity ? (Number(item.price) * Number(item.quantity)).toFixed(2) : '0.00'}</td>
                    <td style="text-align: right; mso-number-format:'0.00';">${isFirstRow && order.discount ? Number(order.discount).toFixed(2) : ''}</td>
                    <td style="text-align: center;">${isFirstRow ? (order.couponCode || '') : ''}</td>
                    <td style="text-align: right; font-weight: bold; mso-number-format:'0.00';">${isFirstRow ? Number(order.total || 0).toFixed(2) : ''}</td>
                    <td>${order.shippingCompany?.name || '-'}</td>
                    <td style="mso-number-format:'\\@';">${order.trackingNumber || '-'}</td>
                    <td>${order.comment || ''}</td>
                </tr>`
            })
        })

        const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Commandes Riwaya</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #047857; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #065f46; text-align: center; }
                td { padding: 8px; border: 1px solid #e5e7eb; vertical-align: middle; }
                tr:nth-child(even) td { background-color: #f9fafb; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
        </html>`

        const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        link.href = url
        link.setAttribute('download', `Riwaya_Commandes_${date}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 uppercase tracking-wider cursor-pointer"
            title="Exporter les commandes sous format Excel (.xls)"
        >
            <FileSpreadsheet className="w-5 h-5" />
            Exporter Excel
        </button>
    )
}
