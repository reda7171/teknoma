"use client"

import React, { useState, useEffect } from 'react'
import { ShoppingBag, AlertCircle, ChevronLeft, ChevronRight, Truck, CheckCircle2, TrendingUp, RefreshCw, Package, Eye, XCircle, Printer, Send, FileText, ExternalLink, Search, Filter, BookOpen, X, SlidersHorizontal } from 'lucide-react'
import { getJumiaOrders, getJumiaStats, cancelJumiaOrderFull, packJumiaOrderFull, printJumiaOrderLabelsFull, readyToShipJumiaOrderFull, printJumiaOrderInvoiceFull, restoreJumiaOrderStock, syncAllJumiaStock } from './actions'
import JumiaOrdersEvolutionChart from '@/components/admin/JumiaOrdersEvolutionChart'

function normalizeForSearch(str: string): string {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .trim()
}

export default function JumiaOrdersClient() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [productTitleFilter, setProductTitleFilter] = useState<string>('')
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)
    const [currentToken, setCurrentToken] = useState<string | null>(null)
    const [tokenHistory, setTokenHistory] = useState<string[]>([])
    const [hasNextPage, setHasNextPage] = useState(false)
    const [stats, setStats] = useState<any>(null)
    const [cancelingId, setCancelingId] = useState<string | null>(null)
    const [packingId, setPackingId] = useState<string | null>(null)
    const [printingId, setPrintingId] = useState<string | null>(null)
    const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null)
    const [readyId, setReadyId] = useState<string | null>(null)
    const [restoreStockId, setRestoreStockId] = useState<string | null>(null)
    const [syncingStock, setSyncingStock] = useState(false)
    const [confirmAction, setConfirmAction] = useState<{ action: 'PACK' | 'READY_TO_SHIP' | 'CANCEL', orderId: string, orderNumber: string } | null>(null)

    // Order items details state
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [orderItems, setOrderItems] = useState<any[]>([])
    const [loadingItems, setLoadingItems] = useState(false)

    const size = 50

    const fetchOrders = async (status: string, token?: string | null, isNext: boolean = false, orderDir: 'desc' | 'asc' = sortOrder) => {
        setLoading(true)
        setErrorMsg(null)
        try {
            // L'API Jumia exige un range de 3 mois max pour voir l'historique, sinon elle ne renvoie que la date du jour.
            const threeMonthsAgo = new Date()
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2) // Using 2 months to be safe with 3 month range limit
            const createdAfter = threeMonthsAgo.toISOString().split('T')[0]

            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const createdBefore = tomorrow.toISOString().split('T')[0]

            const response = await getJumiaOrders(size, token || undefined, status || undefined, createdAfter, createdBefore, 'createdAt', orderDir.toUpperCase())

            setOrders(response.orders)
            setCurrentToken(response.nextToken)
            setHasNextPage(!!response.nextToken)

            if (isNext && token) {
                setTokenHistory(prev => [...prev, token])
            } else if (!token) {
                setTokenHistory([])
            }
        } catch (e: any) {
            setErrorMsg(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders(statusFilter, undefined)
        if (!stats) {
            getJumiaStats().then(data => {
                if (data) setStats(data)
            })
        }
    }, [statusFilter])

    const handleNextPage = () => {
        if (currentToken) {
            fetchOrders(statusFilter, currentToken, true)
        }
    }

    const handlePrevPage = () => {
        if (tokenHistory.length > 0) {
            const previousToken = tokenHistory[tokenHistory.length - 2] // The one before the current token
            // If it's the first page, there is no previous token
            setTokenHistory(prev => prev.slice(0, -1))
            fetchOrders(statusFilter, previousToken, false)
        }
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value)
        setTokenHistory([])
        fetchOrders(e.target.value, undefined)
    }

    const uniqueProductTitles = React.useMemo(() => {
        const titles = new Set<string>()
        orders.forEach(o => {
            (o.items || []).forEach((item: any) => {
                if (item.name) titles.add(item.name)
            })
        })
        return Array.from(titles).sort((a, b) => a.localeCompare(b))
    }, [orders])

    const filteredOrders = React.useMemo(() => {
        const list = orders.filter(order => {
            const normSearch = normalizeForSearch(searchTerm)
            const normProduct = normalizeForSearch(productTitleFilter)

            const itemNames = (order.items || []).map((i: any) => i.name).filter(Boolean).join(' ')
            const normItemNames = normalizeForSearch(itemNames)

            const customerName = `${order.shippingAddress?.firstName || order.CustomerFirstName || ''} ${order.shippingAddress?.lastName || order.CustomerLastName || ''}`
            const city = order.shippingAddress?.city || ''
            const orderNumber = String(order.number || order.OrderId || order.OrderNumber || '')

            const matchesSearch = !normSearch ? true : (
                normalizeForSearch(customerName).includes(normSearch) ||
                orderNumber.toLowerCase().includes(normSearch) ||
                normalizeForSearch(city).includes(normSearch) ||
                normItemNames.includes(normSearch)
            )

            const matchesProduct = !normProduct ? true : normItemNames.includes(normProduct)

            return matchesSearch && matchesProduct
        })

        return list.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.CreatedAt || a.created_at || 0).getTime()
            const dateB = new Date(b.createdAt || b.CreatedAt || b.created_at || 0).getTime()
            let diff = 0
            if (dateA && dateB && dateA !== dateB) {
                diff = dateB - dateA
            } else {
                const numA = Number(String(a.number || a.OrderId || a.OrderNumber || a.id || '').replace(/\D/g, '')) || 0
                const numB = Number(String(b.number || b.OrderId || b.OrderNumber || b.id || '').replace(/\D/g, '')) || 0
                diff = numB - numA
            }
            return sortOrder === 'desc' ? diff : -diff
        })
    }, [orders, searchTerm, productTitleFilter, sortOrder])

    const handleCancelOrder = async (orderId: string) => {
        setConfirmAction(null)
        setCancelingId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            await cancelJumiaOrderFull(orderId)
            setSuccessMsg(`Commande ${orderId} annulée avec succès.`)
            fetchOrders(statusFilter, currentToken) // Actualiser la page courante
        } catch (e: any) {
            setErrorMsg(`Impossible d'annuler: ${e.message}`)
        } finally {
            setCancelingId(null)
        }
    }

    const handleRestoreStock = async (orderId: string, reason: 'FAILED' | 'CANCELED' | 'RETURNED') => {
        setRestoreStockId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const result = await restoreJumiaOrderStock(orderId, reason)
            if (result.success) {
                setSuccessMsg(`Stock de la commande ${orderId} réintégré avec succès.`)
            } else {
                setErrorMsg(result.error || 'Erreur lors de la réintégration du stock')
            }
        } catch (e: any) {
            setErrorMsg(`Erreur: ${e.message}`)
        } finally {
            setRestoreStockId(null)
        }
    }

    const handlePackOrder = async (orderId: string) => {
        setConfirmAction(null)
        setPackingId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)

        try {
            await packJumiaOrderFull(orderId)
            setSuccessMsg(`Commande ${orderId} marquée comme "Prête à expédier" !`)
            fetchOrders(statusFilter, currentToken)
        } catch (e: any) {
            setErrorMsg(`Impossible de préparer la commande: ${e.message}`)
        } finally {
            setPackingId(null)
        }
    }

    const handlePrintLabels = async (orderId: string) => {
        setPrintingId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const response = await printJumiaOrderLabelsFull(orderId)

            // Jumia API may return base64 document, a URL, or the V2 format with success.labels
            const v2Base64 = response?.success?.labels?.[0]?.label
            const base64Data = v2Base64 || response.document || response.file || response.data || response.pdf || response
            const contentType = response.contentType || 'application/pdf'
            const extension = contentType.includes('zip') ? 'zip' : 'pdf'

            if (typeof base64Data === 'string' && (base64Data.startsWith('JVBER') || base64Data.startsWith('UEsDB') || base64Data.length > 100)) {
                // Base64 to Blob
                const byteCharacters = atob(base64Data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: contentType })
                const url = window.URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `etiquette_jumia_${orderId}.${extension}`)
                document.body.appendChild(link)
                link.click()
                link.parentNode?.removeChild(link)
                window.URL.revokeObjectURL(url)

                setSuccessMsg(`Étiquettes pour la commande ${orderId} générées et téléchargées.`)
            } else if (response.url || response.link || (typeof base64Data === 'string' && base64Data.startsWith('http'))) {
                const targetUrl = response.url || response.link || base64Data
                window.open(targetUrl, '_blank')
                setSuccessMsg(`Étiquettes ouvertes dans un nouvel onglet.`)
            } else {
                console.error("Format inconnu:", response)
                setErrorMsg("Le format de l'étiquette retourné par Jumia n'est pas pris en charge actuellement.")
            }
        } catch (e: any) {
            setErrorMsg(`Impossible d'imprimer l'étiquette: ${e.message}`)
        } finally {
            setPrintingId(null)
        }
    }

    const handleViewItems = async (orderId: string) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null)
            return
        }
        setExpandedOrder(orderId)
        setLoadingItems(true)
        try {
            const { getJumiaOrderItems } = await import('./actions')
            const items = await getJumiaOrderItems(orderId)
            setOrderItems(items)
        } catch (e: any) {
            setErrorMsg("Erreur lors du chargement des articles: " + e.message)
        } finally {
            setLoadingItems(false)
        }
    }

    const handlePrintInvoice = async (orderId: string) => {
        setPrintInvoiceId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            // Jumia V2 API does not have an endpoint for invoice generation.
            // We generate the invoice locally using the order details and items.

            // 1. Find the order in state
            const order = orders.find((o: any) => (o.id || o.number || o.OrderId || o.OrderNumber) === orderId)
            if (!order) throw new Error("Commande introuvable.")

            // 2. Fetch order items to detail the invoice
            let items: any[] = []
            try {
                // Fetch items using the existing action that calls Jumia API
                const { getJumiaOrderItems } = await import('./actions')
                items = await getJumiaOrderItems(orderId)
            } catch (err) {
                console.error("Impossible de récupérer les articles pour la facture", err)
            }

            // 3. Construct HTML Invoice
            const invoiceHtml = `
                <html lang="fr">
                <head>
                    <title>Facture Jumia - ${orderId}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { font-size: 24px; font-weight: 900; color: #f97316; }
                        .invoice-title { font-size: 28px; font-weight: 300; text-transform: uppercase; letter-spacing: 2px; }
                        .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
                        .box { background: #f8fafc; padding: 15px; border-radius: 8px; width: 45%; }
                        h3 { margin-top: 0; font-size: 12px; text-transform: uppercase; color: #64748b; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                        th { background: #f1f5f9; font-weight: 600; font-size: 12px; text-transform: uppercase; }
                        .total-row { font-weight: bold; font-size: 18px; }
                        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Tekno Store x JUMIA</div>
                        <div class="invoice-title">Facture</div>
                    </div>

                    <div class="details">
                        <div class="box">
                            <h3>Détails de la commande</h3>
                            <p><strong>N° Commande :</strong> ${order.number || order.OrderId || order.OrderNumber || orderId}</p>
                            <p><strong>Date :</strong> ${new Date(order.createdAt || order.CreatedAt).toLocaleString('fr-FR')}</p>
                            <p><strong>Méthode de paiement :</strong> ${order.paymentMethod || order.PaymentMethod || 'JumiaPay / COD'}</p>
                        </div>
                        <div class="box">
                            <h3>Facturé à</h3>
                            <p><strong>Nom :</strong> ${order.shippingAddress?.firstName || order.CustomerFirstName || ''} ${order.shippingAddress?.lastName || order.CustomerLastName || ''}</p>
                            <p><strong>Téléphone :</strong> ${order.shippingAddress?.phone || order.shippingAddress?.phone2 || 'N/A'}</p>
                            <p><strong>Adresse :</strong> ${order.shippingAddress?.address1 || ''}, ${order.shippingAddress?.city || ''}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>SKU</th>
                                <th>Prix unitaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items && items.length > 0 ? items.map((item: any) => `
                                <tr>
                                    <td>${item.name || item.Name || 'Produit Jumia'}</td>
                                    <td>${item.sku || item.Sku || item.SellerSku || '-'}</td>
                                    <td>${parseFloat(item.price || item.ItemPrice || '0').toLocaleString('fr-MA')} درهم</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3" style="text-align: center">Articles inclus dans le total global</td>
                                </tr>
                            `}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="text-align: right; padding-top: 20px;" class="total-row">Total TTC :</td>
                                <td style="padding-top: 20px;" class="total-row">${(order.totalAmountLocal?.value || order.Price || order.GrandTotal || '0')} درهم</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="footer">
                        Merci de votre confiance. Cette facture a été générée automatiquement depuis le système Tekno Store.
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `

            // 4. Open in new window and print
            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(invoiceHtml)
                printWindow.document.close()
                setSuccessMsg(`Facture générée localement pour la commande ${orderId}.`)
            } else {
                setErrorMsg("Veuillez autoriser les pop-ups pour afficher la facture.")
            }

        } catch (e: any) {
            setErrorMsg(`Impossible de générer la facture: ${e.message}`)
        } finally {
            setPrintInvoiceId(null)
        }
    }

    const handleReadyToShipOrder = async (orderId: string) => {
        setConfirmAction(null)
        setReadyId(orderId)
        setErrorMsg(null)
        setSuccessMsg(null)

        try {
            await readyToShipJumiaOrderFull(orderId)
            setSuccessMsg(`Commande ${orderId} validée "Prête à expédier" (Ready to Ship) avec succès !`)
            fetchOrders(statusFilter, currentToken)
        } catch (e: any) {
            setErrorMsg(`Erreur "Ready to Ship": ${e.message}`)
        } finally {
            setReadyId(null)
        }
    }

    const handleSyncStock = async () => {
        setSyncingStock(true)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const result = await syncAllJumiaStock()
            if (result.error) {
                setErrorMsg(`Erreur synchronisation stock: ${result.error}`)
            } else {
                setSuccessMsg(`Stock synchronisé avec succès ! (${result.count} produits mis à jour sur Jumia)`)
            }
        } catch (e: any) {
            setErrorMsg(`Erreur lors de la synchronisation: ${e.message}`)
        } finally {
            setSyncingStock(false)
        }
    }

    return (
        <div className="space-y-6">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-blue-50 text-blue-600 rounded-xl"><Package className="w-4 h-4" /></div>
                            Total (3 mois)
                        </div>
                        <p className="text-2xl lg:text-3xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle className="w-4 h-4" /></div>
                            Nouvelles
                        </div>
                        <p className="text-2xl lg:text-3xl font-black text-slate-800">{stats.pending}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Truck className="w-4 h-4" /></div>
                            En transit
                        </div>
                        <p className="text-2xl lg:text-3xl font-black text-slate-800">{stats.shipped}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-rose-50 text-rose-600 rounded-xl"><XCircle className="w-4 h-4" /></div>
                            Annulées
                        </div>
                        <p className="text-2xl lg:text-3xl font-black text-slate-800">{stats.canceled}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-slate-100 text-slate-600 rounded-xl"><XCircle className="w-4 h-4" /></div>
                            Échouées
                        </div>
                        <p className="text-2xl lg:text-3xl font-black text-slate-800">{stats.failed}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs lg:text-sm">
                            <div className="p-1.5 lg:p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
                            CA Estimé
                        </div>
                        <p className="text-xl lg:text-2xl font-black text-slate-800">{stats.revenue.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD</p>
                    </div>
                </div>
            )}

            {stats && stats.evolutionData && (
                <JumiaOrdersEvolutionChart data={stats.evolutionData} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        Commandes Jumia
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <select aria-label="Champ de sélection"
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Toutes les commandes</option>
                        <option value="PENDING">Nouvelles (En attente)</option>
                        <option value="READY_TO_SHIP">Prêtes à expédier</option>
                        <option value="SHIPPED">Expédiées (Historique)</option>
                        <option value="DELIVERED">Livrées (Historique)</option>
                        <option value="CANCELED">Annulées (Historique)</option>
                        <option value="RETURNED">Retournées (Historique)</option>
                        <option value="FAILED">Échouées (Historique)</option>
                    </select>
                    <select aria-label="Ordre de tri"
                        value={sortOrder}
                        onChange={(e) => {
                            const val = e.target.value as 'desc' | 'asc'
                            setSortOrder(val)
                            fetchOrders(statusFilter, currentToken, false, val)
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="desc">Tri : Date DESC (Plus récent)</option>
                        <option value="asc">Tri : Date ASC (Plus ancien)</option>
                    </select>
                    <button
                        onClick={() => fetchOrders(statusFilter, currentToken || undefined)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
                    </button>
                    <button
                        onClick={handleSyncStock}
                        disabled={syncingStock}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-100 transition-all disabled:opacity-50"
                        title="Synchroniser le stock local vers Jumia"
                    >
                        {syncingStock ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                        <span className="hidden md:inline">Sync Stock</span>
                    </button>
                    <a
                        href="/api/admin/jumia/export"
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all"
                        title="Exporter les commandes du mois en CSV"
                    >
                        ⬇️ CSV
                    </a>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-3xl flex items-center gap-4 text-red-700">
                    <AlertCircle className="w-8 h-8 shrink-0" />
                    <div>
                        <h3 className="font-bold">Erreur</h3>
                        <p className="text-sm opacity-80">{errorMsg}</p>
                    </div>
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex items-center gap-4 text-emerald-700">
                    <CheckCircle2 className="w-8 h-8 shrink-0" />
                    <div>
                        <h3 className="font-bold">Succès</h3>
                        <p className="text-sm opacity-80">{successMsg}</p>
                    </div>
                </div>
            )}

            {/* Search & Filters Panel */}
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                isFilterOpen || searchTerm || productTitleFilter || statusFilter
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Search className="w-4 h-4" />
                            {isFilterOpen ? 'Fermer la recherche' : 'Recherche & Filtres'}
                        </button>

                        {(searchTerm || productTitleFilter || statusFilter) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('')
                                    setProductTitleFilter('')
                                    setStatusFilter('')
                                    fetchOrders('', undefined)
                                }}
                                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        {filteredOrders.length} {filteredOrders.length === 1 ? 'Commande trouvée' : 'Commandes trouvées'} ({orders.length} chargées)
                    </div>
                </div>

                {isFilterOpen && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Recherche Rapide */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <Search className="w-3 h-3" />
                                    Recherche rapide
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Client, N° commande, ville, titre..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-bold text-sm"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-1"
                                            title="Effacer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filtre Titre du Livre / Produit */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <BookOpen className="w-3 h-3" />
                                    Titre du livre / produit
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="jumia-product-titles-list"
                                        placeholder="Ex: Emotional Intelligence, Pack..."
                                        value={productTitleFilter}
                                        onChange={(e) => setProductTitleFilter(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-bold text-sm pr-9"
                                    />
                                    {productTitleFilter && (
                                        <button
                                            type="button"
                                            onClick={() => setProductTitleFilter('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-1"
                                            title="Effacer le filtre"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                    {uniqueProductTitles.length > 0 && (
                                        <datalist id="jumia-product-titles-list">
                                            {uniqueProductTitles.map((title) => (
                                                <option key={title} value={title} />
                                            ))}
                                        </datalist>
                                    )}
                                </div>
                            </div>

                            {/* Statut Jumia */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <Filter className="w-3 h-3" />
                                    Statut de la commande
                                </label>
                                <select aria-label="Filtrer par statut"
                                    value={statusFilter}
                                    onChange={handleStatusChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-bold text-sm"
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="PENDING">Nouvelles (En attente)</option>
                                    <option value="READY_TO_SHIP">Prêtes à expédier</option>
                                    <option value="SHIPPED">Expédiées (Historique)</option>
                                    <option value="DELIVERED">Livrées (Historique)</option>
                                    <option value="CANCELED">Annulées (Historique)</option>
                                    <option value="RETURNED">Retournées (Historique)</option>
                                    <option value="FAILED">Échouées (Historique)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        {loading && orders.length === 0 ? (
                            <div className="flex items-center justify-center h-64 text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">ID Jumia</th>
                                        <th
            onClick={() => {
                const nextSort = sortOrder === 'desc' ? 'asc' : 'desc'
                setSortOrder(nextSort)
                fetchOrders(statusFilter, currentToken, false, nextSort)
            }}
            className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
            title="Cliquer pour basculer l'ordre (actuel: DESC)"
        >
            <div className="flex items-center gap-1.5">
                <span>Date</span>
                <span className="text-orange-500 font-black">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">{sortOrder === 'desc' ? 'DESC' : 'ASC'}</span>
            </div>
        </th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Client</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Articles</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Statut</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">Total</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                                                Aucune commande trouvée.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order: any, index: number) => (
                                            <React.Fragment key={order.id || order.OrderId || index}>
                                                <tr className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4 font-bold text-slate-900">{order.number || order.OrderId || order.OrderNumber || 'N/A'}</td>
                                                <td className="p-4 text-slate-500 font-medium">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    }) : (order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('fr-FR') : 'N/A')}
                                                </td>
                                                <td className="p-4 font-medium text-slate-700">
                                                    {order.shippingAddress?.firstName || order.CustomerFirstName} {order.shippingAddress?.lastName || order.CustomerLastName}
                                                </td>
                                                <td className="p-4 max-w-[220px]">
                                                    <div className="font-bold text-slate-900 text-xs">
                                                        {order.items?.length ? `${order.items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)} article(s)` : `${order.totalItems || 1} article(s)`}
                                                    </div>
                                                    {order.items && order.items.length > 0 && (
                                                        <div className="text-[11px] text-slate-500 truncate" title={order.items.map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', ')}>
                                                            {order.items.map((i: any) => i.name).filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                                                        (order.status || order.Statuses?.[0] || 'pending').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        (order.status || order.Statuses?.[0] || 'pending').toLowerCase() === 'canceled' ? 'bg-red-100 text-red-700' :
                                                        (order.status || order.Statuses?.[0] || 'pending').toLowerCase() === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {order.status || order.Statuses?.[0] || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-900 text-right">
                                                    <span className="font-mono text-slate-400 tracking-widest text-xs">****</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(() => {
                                                        const currentStatus = (order.status || order.Statuses?.[0] || 'pending').toLowerCase()
                                                        return (
                                                            <div className="flex flex-col gap-2 w-full max-w-[140px] mx-auto">
                                                                {currentStatus === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setConfirmAction({ action: 'PACK', orderId: order.id || order.number || order.OrderId || order.OrderNumber, orderNumber: order.number || order.OrderId || order.OrderNumber || 'N/A' })}
                                                                            disabled={packingId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full bg-orange-100 text-orange-700 hover:bg-orange-200`}
                                                                        >
                                                                            {packingId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : (
                                                                                <><Package className="w-3 h-3" /> Préparer</>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => setConfirmAction({ action: 'READY_TO_SHIP', orderId: order.number || order.OrderId || order.OrderNumber, orderNumber: order.number || order.OrderId || order.OrderNumber || 'N/A' })}
                                                                            disabled={readyId === (order.number || order.OrderId || order.OrderNumber)}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full bg-blue-100 text-blue-700 hover:bg-blue-200`}
                                                                            title="Une fois préparée (Packed), validez l'expédition"
                                                                        >
                                                                            {readyId === (order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : (
                                                                                <><Send className="w-3 h-3" /> Expédier</>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => setConfirmAction({ action: 'CANCEL', orderId: order.id || order.number || order.OrderId || order.OrderNumber, orderNumber: order.number || order.OrderId || order.OrderNumber || 'N/A' })}
                                                                            disabled={cancelingId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full bg-red-50 text-red-600 hover:bg-red-100`}
                                                                        >
                                                                            {cancelingId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : (
                                                                                <><XCircle className="w-3 h-3" /> Annuler</>
                                                                            )}
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {(currentStatus === 'ready_to_ship' || currentStatus === 'shipped' || currentStatus === 'delivered') && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handlePrintLabels(order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            disabled={printingId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            className="text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                                        >
                                                                            {printingId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : (
                                                                                <><Printer className="w-3 h-3" /> Étiquette</>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handlePrintInvoice(order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            disabled={printInvoiceId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            className="text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                                        >
                                                                            {printInvoiceId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : (
                                                                                <><FileText className="w-3 h-3" /> Facture</>
                                                                            )}
                                                                        </button>
                                                                    </>
                                                                )}

                                                                <button
                                                                    onClick={() => handleViewItems(order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                    disabled={loadingItems && expandedOrder === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                    className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full mt-1 ${
                                                                        expandedOrder === (order.id || order.number || order.OrderId || order.OrderNumber)
                                                                        ? 'bg-slate-700 text-white hover:bg-slate-800'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {loadingItems && expandedOrder === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                        <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                    ) : (
                                                                        <><Eye className="w-3 h-3" /> {expandedOrder === (order.id || order.number || order.OrderId || order.OrderNumber) ? 'Fermer' : 'Détails'}</>
                                                                    )}
                                                                </button>

                                                                {/* Bouton Restaurer Stock pour FAILED/CANCELED/RETURNED */}
                                                                {(currentStatus === 'failed' || currentStatus === 'canceled' || currentStatus === 'cancelled' || currentStatus === 'returned') && (
                                                                    <button
                                                                        onClick={() => handleRestoreStock(
                                                                            order.id || order.number || order.OrderId || order.OrderNumber,
                                                                            currentStatus === 'failed' ? 'FAILED' : currentStatus === 'returned' ? 'RETURNED' : 'CANCELED'
                                                                        )}
                                                                        disabled={restoreStockId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                        className="text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full mt-1 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                                                                        title="Réintégrer le stock dans le site + Jumia"
                                                                    >
                                                                        {restoreStockId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                            <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                        ) : (
                                                                            <><Package className="w-3 h-3" /> Restaurer Stock</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}
                                                </td>
                                            </tr>
                                            {expandedOrder === (order.id || order.number || order.OrderId || order.OrderNumber) && (
                                                <tr key={`items-${order.id || order.OrderId || index}`}>
                                                    <td colSpan={6} className="p-0 border-b border-slate-100">
                                                        <div className="bg-slate-50 p-6 border-l-4 border-l-orange-500 shadow-inner">
                                                            {loadingItems ? (
                                                                <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-orange-400" /></div>
                                                            ) : orderItems.length === 0 ? (
                                                                <div className="text-center text-slate-500 p-4">Aucun article trouvé.</div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                                        <Package className="w-4 h-4 text-orange-500" />
                                                                        Articles de la commande ({orderItems.length})
                                                                    </h4>
                                                                    <table className="w-full text-left text-xs bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                                        <thead className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="p-3 font-semibold">Produit</th>
                                                                                <th className="p-3 font-semibold">SKU Vendeur</th>
                                                                                <th className="p-3 font-semibold">Statut</th>
                                                                                <th className="p-3 font-semibold">Prix</th>
                                                                                <th className="p-3 font-semibold">Tracking</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {orderItems.map((item: any, idx: number) => (
                                                                                <tr key={item.id || item.OrderItemId || idx} className="hover:bg-slate-50/50 transition-colors">
                                                                                    <td className="p-3 flex items-center gap-3">
                                                                                        {item.product?.imageUrl ? (
                                                                                            <img src={item.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                                                                        ) : (
                                                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                                                                                <Package className="w-5 h-5" />
                                                                                            </div>
                                                                                        )}
                                                                                        <span className="font-medium text-slate-700 line-clamp-2 max-w-[250px]">
                                                                                             <a
                                                                                                href={item.productUrl || item.ProductUrl || (item.product?.name ? `https://www.jumia.ma/catalog/?q=${encodeURIComponent(item.product.name)}` : 'https://www.jumia.ma')}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                className="hover:text-orange-500 hover:underline inline-flex items-center gap-1 transition-colors"
                                                                                                title="Voir sur Jumia"
                                                                                            >
                                                                                                {item.product?.name || item.Name || 'Produit inconnu'}
                                                                                                <ExternalLink className="w-3 h-3 text-slate-400 inline-block shrink-0" />
                                                                                            </a>
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3 font-mono text-slate-500">{item.product?.sellerSku || item.Sku}</td>
                                                                                    <td className="p-3">
                                                                                        <span className={`inline-flex px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md ${
                                                                                            (item.status || item.Status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                                            (item.status || item.Status || '').toLowerCase() === 'canceled' ? 'bg-red-100 text-red-700' :
                                                                                            (item.status || item.Status || '').toLowerCase() === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                                                            'bg-orange-100 text-orange-700'
                                                                                        }`}>
                                                                                            {item.status || item.Status || 'N/A'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3 font-bold text-slate-900"><span className="font-mono text-slate-400 tracking-widest text-xs">****</span></td>
                                                                                    <td className="p-3">
                                                                                        {item.trackingNumber || item.TrackingCode ? (
                                                                                            <a href={item.trackingUrl || '#'} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline font-mono text-[10px] bg-blue-50 px-2 py-1 rounded-md">
                                                                                                {item.trackingNumber || item.TrackingCode}
                                                                                            </a>
                                                                                        ) : <span className="text-slate-400 italic">Non expédié</span>}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Jumia Token-based */}
                    <div className="flex items-center justify-between mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-medium text-slate-500">
                            {orders.length} commandes récupérées
                        </p>
                        <div className="flex items-center gap-3">
                            <button aria-label="Action ChevronLeft"
                                onClick={handlePrevPage}
                                disabled={tokenHistory.length === 0 || loading}
                                className={`p-2 rounded-xl transition-all ${tokenHistory.length === 0 || loading ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 shadow-sm border border-slate-200'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {tokenHistory.length + 1}</span>
                            <button aria-label="Action ChevronRight"
                                onClick={handleNextPage}
                                disabled={!hasNextPage || loading}
                                className={`p-2 rounded-xl transition-all ${!hasNextPage || loading ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 shadow-sm border border-slate-200'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
            </div>

            {/* Modal de confirmation */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Confirmer l'action</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                Êtes-vous sûr de vouloir {confirmAction.action === 'PACK' ? 'préparer' : confirmAction.action === 'READY_TO_SHIP' ? 'expédier' : 'annuler'} la commande <strong className="text-slate-900">{confirmAction.orderNumber}</strong> ?
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Non, retour
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmAction.action === 'PACK') handlePackOrder(confirmAction.orderId)
                                    if (confirmAction.action === 'READY_TO_SHIP') handleReadyToShipOrder(confirmAction.orderId)
                                    if (confirmAction.action === 'CANCEL') handleCancelOrder(confirmAction.orderId)
                                }}
                                className="flex-1 py-3 px-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-md shadow-orange-500/20"
                            >
                                Oui, confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
