'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, SlidersHorizontal, X, Check } from 'lucide-react'

interface ExportOrdersButtonProps {
    orders: any[]
    totalSelected?: number
    className?: string
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

interface ColumnDefinition {
    id: string
    label: string
    category: 'Général' | 'Client' | 'Articles' | 'Finance' | 'Livraison'
    getValue: (order: any, statusLabels: Record<string, string>) => { text: string | number; style: string }
}

const ALL_COLUMNS: ColumnDefinition[] = [
    {
        id: 'id',
        label: 'N° Commande',
        category: 'Général',
        getValue: (order) => ({
            text: `#${order.id.slice(0, 8)}`,
            style: "mso-number-format:'\\@'; text-align: center; font-weight: bold;"
        })
    },
    {
        id: 'date',
        label: 'Date & Heure',
        category: 'Général',
        getValue: (order) => {
            const dateFormatted = order.createdAtFormatted || (order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR', {
                timeZone: 'Africa/Casablanca',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : '-')
            return {
                text: dateFormatted,
                style: "mso-number-format:'\\@'; text-align: center;"
            }
        }
    },
    {
        id: 'channel',
        label: 'Canal',
        category: 'Général',
        getValue: (order) => ({
            text: order.salesChannel || 'TEKNO_STORE',
            style: "text-align: center;"
        })
    },
    {
        id: 'status',
        label: 'Statut',
        category: 'Général',
        getValue: (order, labels) => ({
            text: labels[order.status] || order.status || '-',
            style: "text-align: center; font-weight: bold;"
        })
    },
    {
        id: 'customer',
        label: 'Client',
        category: 'Client',
        getValue: (order) => ({
            text: order.fullName || '-',
            style: ""
        })
    },
    {
        id: 'phone',
        label: 'Téléphone',
        category: 'Client',
        getValue: (order) => ({
            text: order.phone || '-',
            style: "mso-number-format:'\\@'; text-align: center;"
        })
    },
    {
        id: 'city',
        label: 'Ville',
        category: 'Client',
        getValue: (order) => ({
            text: order.city || '-',
            style: ""
        })
    },
    {
        id: 'address',
        label: 'Adresse Complète',
        category: 'Client',
        getValue: (order) => ({
            text: order.address || '-',
            style: ""
        })
    },
    {
        id: 'items',
        label: 'Articles Commandés',
        category: 'Articles',
        getValue: (order) => {
            const items = order.items || []
            const text = items.map((item: any) => {
                const title = item.type === 'BOOK'
                    ? (item.book?.title || 'Livre')
                    : item.type === 'PACK'
                    ? (item.pack?.name || 'Pack')
                    : (item.extraProduct?.name || 'Article')
                const qty = item.quantity || 1
                return `${title} (x${qty})`
            }).join(' + ') || '-'
            return { text, style: "" }
        }
    },
    {
        id: 'quantity',
        label: "Nombre d'Articles",
        category: 'Articles',
        getValue: (order) => {
            const items = order.items || []
            const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
            return {
                text: totalQuantity,
                style: "text-align: center; mso-number-format:'0';"
            }
        }
    },
    {
        id: 'total',
        label: 'Total Commande (MAD)',
        category: 'Finance',
        getValue: (order) => ({
            text: Number(order.total || 0).toFixed(2),
            style: "text-align: right; font-weight: bold; mso-number-format:'0.00';"
        })
    },
    {
        id: 'discount',
        label: 'Remise (MAD)',
        category: 'Finance',
        getValue: (order) => ({
            text: order.discount ? Number(order.discount).toFixed(2) : '0.00',
            style: "text-align: right; mso-number-format:'0.00';"
        })
    },
    {
        id: 'coupon',
        label: 'Code Promo',
        category: 'Finance',
        getValue: (order) => ({
            text: order.couponCode || '-',
            style: "text-align: center;"
        })
    },
    {
        id: 'paymentMethod',
        label: 'Mode Paiement',
        category: 'Finance',
        getValue: (order) => ({
            text: order.paymentMethod || 'COD',
            style: "text-align: center;"
        })
    },
    {
        id: 'paymentState',
        label: 'État Paiement',
        category: 'Finance',
        getValue: (order) => ({
            text: order.isPaid ? 'Payé' : 'Non payé',
            style: "text-align: center; font-weight: bold;"
        })
    },
    {
        id: 'shippingCompany',
        label: 'Transporteur',
        category: 'Livraison',
        getValue: (order) => ({
            text: order.shippingCompanyName || order.shippingCompany?.name || order.shippingCompany || '-',
            style: ""
        })
    },
    {
        id: 'trackingNumber',
        label: 'N° Suivi',
        category: 'Livraison',
        getValue: (order) => ({
            text: order.trackingNumber || '-',
            style: "mso-number-format:'\\@'; text-align: center;"
        })
    },
    {
        id: 'comment',
        label: 'Commentaire Client',
        category: 'Client',
        getValue: (order) => ({
            text: order.comment || '',
            style: ""
        })
    }
]

const PRESETS: Record<string, { label: string; columnIds: string[] }> = {
    all: {
        label: 'Complet (Toutes)',
        columnIds: ALL_COLUMNS.map(c => c.id)
    },
    delivery: {
        label: 'Logistique / Livreur',
        columnIds: ['id', 'customer', 'phone', 'city', 'address', 'items', 'quantity', 'total', 'paymentMethod', 'shippingCompany', 'trackingNumber', 'comment']
    },
    finance: {
        label: 'Comptabilité / Finances',
        columnIds: ['id', 'date', 'channel', 'status', 'customer', 'total', 'discount', 'coupon', 'paymentMethod', 'paymentState']
    }
}

const STORAGE_KEY = 'tekno_export_orders_columns_v1'

export default function ExportOrdersButton({ orders, totalSelected, className }: ExportOrdersButtonProps) {
    const isSelectionEmpty = totalSelected !== undefined ? totalSelected === 0 : orders.length === 0
    const countDisplay = totalSelected !== undefined ? totalSelected : orders.length

    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id))
    const [showConfigModal, setShowConfigModal] = useState(false)

    // Charger les préférences de colonnes depuis le localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSelectedColumns(parsed)
                }
            }
        } catch {
            // Utiliser la configuration par défaut en cas d'erreur
        }
    }, [])

    const saveColumns = (newCols: string[]) => {
        setSelectedColumns(newCols)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newCols))
        } catch {
            // Ignorer si localStorage indisponible
        }
    }

    const toggleColumn = (id: string) => {
        if (selectedColumns.includes(id)) {
            if (selectedColumns.length === 1) {
                alert('Veuillez conserver au moins une colonne active.')
                return
            }
            saveColumns(selectedColumns.filter(c => c !== id))
        } else {
            saveColumns([...selectedColumns, id])
        }
    }

    const applyPreset = (presetKey: string) => {
        const preset = PRESETS[presetKey]
        if (preset) {
            saveColumns(preset.columnIds)
        }
    }

    const handleExport = () => {
        if (!orders || orders.length === 0) {
            alert('Veuillez sélectionner au moins une commande à exporter.')
            return
        }

        const activeCols = ALL_COLUMNS.filter(c => selectedColumns.includes(c.id))
        if (activeCols.length === 0) {
            alert('Veuillez activer au moins une colonne à exporter.')
            return
        }

        const headers = activeCols.map(c => c.label)

        let tableRows = ''

        orders.forEach((order) => {
            const cells = activeCols.map(col => {
                const res = col.getValue(order, statusLabels)
                return `<td style="${res.style}">${res.text}</td>`
            }).join('')

            tableRows += `<tr>${cells}</tr>`
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
                            <x:Name>Commandes Tekno Store</x:Name>
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
        link.setAttribute('download', `Tekno Store_Commandes_${date}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <>
            <div className="inline-flex items-center rounded-xl overflow-hidden shadow-sm border border-gray-200">
                <button
                    onClick={handleExport}
                    className={className || `inline-flex items-center gap-2 ${
                        isSelectionEmpty
                            ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    } px-4 py-2 font-black text-sm transition-all uppercase tracking-wider cursor-pointer active:scale-95`}
                    title={isSelectionEmpty ? "Veuillez cocher des commandes à exporter" : `Exporter ${countDisplay} commande(s) sous format Excel (.xls)`}
                >
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Exporter Excel {countDisplay > 0 ? `(${countDisplay})` : ''}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className={`${
                        isSelectionEmpty
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-l border-gray-200'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800 border-l border-emerald-800'
                    } px-2.5 py-2 transition-colors cursor-pointer`}
                    title="Filtrer les colonnes de l'export"
                >
                    <SlidersHorizontal className="w-4 h-4" />
                </button>
            </div>

            {/* Modal de configuration des colonnes */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Colonnes de l'export Excel</h3>
                                <p className="text-xs text-gray-500 font-medium">Sélectionnez les colonnes à inclure dans le fichier exporté</p>
                            </div>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Profils préconfigurés */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Profils rapides</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(PRESETS).map(([key, preset]) => {
                                    const isActive = preset.columnIds.length === selectedColumns.length && preset.columnIds.every(id => selectedColumns.includes(id))
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => applyPreset(key)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Liste des colonnes par catégorie */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Colonnes actives ({selectedColumns.length} / {ALL_COLUMNS.length})
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => saveColumns(ALL_COLUMNS.map(c => c.id))}
                                        className="text-[11px] font-black text-emerald-700 hover:underline cursor-pointer"
                                    >
                                        Tout cocher
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => saveColumns(['id', 'customer', 'total'])}
                                        className="text-[11px] font-black text-gray-500 hover:underline cursor-pointer"
                                    >
                                        Minimal
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {ALL_COLUMNS.map((col) => {
                                    const isChecked = selectedColumns.includes(col.id)
                                    return (
                                        <label
                                            key={col.id}
                                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                                                isChecked
                                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleColumn(col.id)}
                                                className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                            />
                                            <div className="flex-1 truncate">
                                                <span>{col.label}</span>
                                                <span className="block text-[9px] text-gray-400 font-normal uppercase">{col.category}</span>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Bouton d'action dans le modal */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-gray-400">
                                Préférences mémorisées sur cet appareil
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfigModal(false)
                                        handleExport()
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Valider & Exporter</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
