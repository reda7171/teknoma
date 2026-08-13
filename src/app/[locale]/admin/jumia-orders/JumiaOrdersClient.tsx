"use client"

import React, { useState, useEffect } from 'react'
import { ShoppingBag, AlertCircle, ChevronLeft, ChevronRight, Truck, CheckCircle2, TrendingUp, RefreshCw, Package, Eye, XCircle, Printer, Send, FileText, ExternalLink } from 'lucide-react'
import { getJumiaOrders, getJumiaStats, cancelJumiaOrderFull, packJumiaOrderFull, printJumiaOrderLabelsFull, readyToShipJumiaOrderFull, getJumiaPayoutStatementsAction, printJumiaOrderInvoiceFull, restoreJumiaOrderStock } from './actions'
import JumiaOrdersEvolutionChart from '@/components/admin/JumiaOrdersEvolutionChart'

export default function JumiaOrdersClient() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [currentToken, setCurrentToken] = useState<string | null>(null)
    const [tokenHistory, setTokenHistory] = useState<string[]>([])
    const [hasNextPage, setHasNextPage] = useState(false)
    const [stats, setStats] = useState<any>(null)
    const [cancelingId, setCancelingId] = useState<string | null>(null)
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
    const [packingId, setPackingId] = useState<string | null>(null)
    const [confirmPackId, setConfirmPackId] = useState<string | null>(null)
    const [printingId, setPrintingId] = useState<string | null>(null)
    const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null)
    const [readyId, setReadyId] = useState<string | null>(null)
    const [confirmReadyId, setConfirmReadyId] = useState<string | null>(null)
    const [restoreStockId, setRestoreStockId] = useState<string | null>(null)
    
    // Order items details state
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [orderItems, setOrderItems] = useState<any[]>([])
    const [loadingItems, setLoadingItems] = useState(false)
    
    const size = 50

    const fetchOrders = async (status: string, token: string | undefined, isNext: boolean = false) => {
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

            const response = await getJumiaOrders(size, token, status || undefined, createdAfter, createdBefore)
            
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

    const handleCancelOrder = async (orderId: string) => {
        if (confirmCancelId !== orderId) {
            setConfirmCancelId(orderId)
            setTimeout(() => setConfirmCancelId(null), 3000) // Reset after 3s
            return
        }
        setConfirmCancelId(null)
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
        if (confirmPackId !== orderId) {
            setConfirmPackId(orderId)
            setTimeout(() => setConfirmPackId(null), 3000)
            return
        }
        
        setConfirmPackId(null)
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
                <html>
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
                        <div class="logo">RIWAYA x JUMIA</div>
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
                        Merci de votre confiance. Cette facture a été générée automatiquement depuis le système Riwaya.
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
        if (confirmReadyId !== orderId) {
            setConfirmReadyId(orderId)
            setTimeout(() => setConfirmReadyId(null), 3000)
            return
        }
        
        setConfirmReadyId(null)
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

    return (
        <div className="space-y-6">
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Package className="w-4 h-4" /></div>
                            Total (3 mois)
                        </div>
                        <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle className="w-4 h-4" /></div>
                            Nouvelles
                        </div>
                        <p className="text-3xl font-black text-slate-800">{stats.pending}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Truck className="w-4 h-4" /></div>
                            En transit
                        </div>
                        <p className="text-3xl font-black text-slate-800">{stats.shipped}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
                            CA Estimé
                        </div>
                        <p className="text-3xl font-black text-slate-800">{stats.revenue.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} درهم</p>
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
                    <select 
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
                    <button 
                        onClick={() => fetchOrders(statusFilter, currentToken || undefined)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
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
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Date</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Client</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Statut</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">Total</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                                Aucune commande trouvée.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order: any, index: number) => (
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
                                                    {order.totalAmountLocal?.value || order.Price || order.GrandTotal || '0'} درهم
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(() => {
                                                        const currentStatus = (order.status || order.Statuses?.[0] || 'pending').toLowerCase()
                                                        return (
                                                            <div className="flex flex-col gap-2 w-full max-w-[140px] mx-auto">
                                                                {currentStatus === 'pending' && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => handlePackOrder(order.id)}
                                                                            disabled={packingId === order.id}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full ${
                                                                                confirmPackId === order.id
                                                                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                                                                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                                            }`}
                                                                        >
                                                                            {packingId === order.id ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : confirmPackId === order.id ? (
                                                                                'Confirmer ?'
                                                                            ) : (
                                                                                <><Package className="w-3 h-3" /> Préparer</>
                                                                            )}
                                                                        </button>
                                                                        
                                                                        <button 
                                                                            onClick={() => handleReadyToShipOrder(order.number || order.OrderId || order.OrderNumber)}
                                                                            disabled={readyId === (order.number || order.OrderId || order.OrderNumber)}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full ${
                                                                                confirmReadyId === (order.number || order.OrderId || order.OrderNumber)
                                                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                            }`}
                                                                            title="Une fois préparée (Packed), validez l'expédition"
                                                                        >
                                                                            {readyId === (order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : confirmReadyId === (order.number || order.OrderId || order.OrderNumber) ? (
                                                                                'Confirmer ?'
                                                                            ) : (
                                                                                <><Send className="w-3 h-3" /> Expédier</>
                                                                            )}
                                                                        </button>
                                                                        
                                                                        <button 
                                                                            onClick={() => handleCancelOrder(order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            disabled={cancelingId === (order.id || order.number || order.OrderId || order.OrderNumber)}
                                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full ${
                                                                                confirmCancelId === (order.id || order.number || order.OrderId || order.OrderNumber)
                                                                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                                                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                                            }`}
                                                                        >
                                                                            {cancelingId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                                                                            ) : confirmCancelId === (order.id || order.number || order.OrderId || order.OrderNumber) ? (
                                                                                'Confirmer ?'
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
                                                                                                href={item.ProductUrl || `https://www.jumia.ma/catalog/?q=${item.product?.sellerSku || item.Sku}`} 
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
                                                                                    <td className="p-3 font-bold text-slate-900">{item.itemPriceLocal || item.Price} {item.country?.currencyCode || 'درهم'}</td>
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
                            <button
                                onClick={handlePrevPage}
                                disabled={tokenHistory.length === 0 || loading}
                                className={`p-2 rounded-xl transition-all ${tokenHistory.length === 0 || loading ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 shadow-sm border border-slate-200'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {tokenHistory.length + 1}</span>
                            <button
                                onClick={handleNextPage}
                                disabled={!hasNextPage || loading}
                                className={`p-2 rounded-xl transition-all ${!hasNextPage || loading ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 shadow-sm border border-slate-200'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
            </div>
        </div>
    )
}
