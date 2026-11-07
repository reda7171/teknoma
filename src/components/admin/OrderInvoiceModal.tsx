'use client'

import { useState, useEffect, useId } from 'react'
import { 
    X, 
    Printer, 
    Save, 
    FileText, 
    Plus, 
    Trash2, 
    DollarSign, 
    CheckCircle2, 
    AlertCircle, 
    Share2, 
    Calendar, 
    User, 
    Phone, 
    MapPin, 
    Building2,
    Loader2
} from 'lucide-react'
import { saveOrderInvoice, InvoiceItemData } from '@/lib/actions/invoices'
import { useUIStore } from '@/store/ui'
import { useRouter } from 'next/navigation'

interface OrderInvoiceModalProps {
    order: any
    locale?: string
    triggerText?: string
    triggerClassName?: string
    children?: React.ReactNode
}

export default function OrderInvoiceModal({ 
    order, 
    locale = 'fr',
    triggerText,
    triggerClassName,
    children
}: OrderInvoiceModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const { showNotification } = useUIStore()
    const router = useRouter()

    // 1. Initial State from Order
    const defaultInvoiceNum = order.invoiceNumber || `FAC-${order.id.slice(0, 8).toUpperCase()}`
    const defaultDate = order.invoiceDate 
        ? new Date(order.invoiceDate).toISOString().split('T')[0]
        : (order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    
    const initialPaid = Number(order.paidAmount) || (order.isPaid ? Number(order.total) : 0)
    const initialRemaining = order.remainingAmount !== null && order.remainingAmount !== undefined
        ? Number(order.remainingAmount)
        : (order.isPaid ? 0 : Math.max(0, Number(order.total) - initialPaid))

    // Form states
    const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNum)
    const [invoiceDate, setInvoiceDate] = useState(defaultDate)
    const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || 'COD')
    const [isPaid, setIsPaid] = useState(order.isPaid || initialRemaining <= 0)

    // Company info (Émetteur)
    const [companyName, setCompanyName] = useState('Riwaya Books')
    const [companyLogo, setCompanyLogo] = useState('/uploads/books/0dded6c73e7283c1-RIWAYA__1_.png')
    const [companyPhone, setCompanyPhone] = useState('07 02 22 05 75 / 06 66 03 81 29')
    const [companyEmail, setCompanyEmail] = useState('contact@riwaya.store')
    const [companyAddress, setCompanyAddress] = useState('Casablanca, Maroc')
    const [companyIce, setCompanyIce] = useState('002589632000045')

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    if (data.settings.site_logo) {
                        setCompanyLogo(data.settings.site_logo)
                    }
                    const rawAgents = data.settings.whatsapp_agents
                    if (rawAgents) {
                        try {
                            const parsed = JSON.parse(rawAgents)
                            if (Array.isArray(parsed)) {
                                const activePhones = parsed
                                    .filter((a: any) => a.enabled !== false && a.phone)
                                    .map((a: any) => {
                                        const raw = String(a.phone).replace(/\s+/g, '')
                                        if (/^0[5-7]\d{8}$/.test(raw)) {
                                            return raw.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
                                        }
                                        return a.phone
                                    })
                                if (activePhones.length > 0) {
                                    setCompanyPhone(activePhones.join(' / '))
                                }
                            }
                        } catch {}
                    }
                }
            })
            .catch(() => {})
    }, [])

    // Customer info (Destinataire)
    const [fullName, setFullName] = useState(order.fullName || '')
    const [phone, setPhone] = useState(order.phone || '')
    const [city, setCity] = useState(order.city || '')
    const [address, setAddress] = useState(order.address || '')
    const [email, setEmail] = useState(order.email || '')

    // Items list (All editable)
    const [items, setItems] = useState<InvoiceItemData[]>(() => {
        if (!order.items || order.items.length === 0) {
            return [{
                id: 'item-1',
                title: 'Livre / Commande Riwaya',
                quantity: 1,
                price: Number(order.total) || 0,
                type: 'BOOK'
            }]
        }
        return order.items.map((it: any) => ({
            id: it.id,
            title: it.book?.title || it.pack?.name || it.extraProduct?.name || (it.type === 'PACK' ? 'Pack Riwaya' : 'Livre'),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            type: it.type || 'BOOK'
        }))
    })

    // Financials
    const [shippingFees, setShippingFees] = useState<number>(Number(order.shippingFees) || 0)
    const [discount, setDiscount] = useState<number>(Number(order.discount) || 0)
    const [paidAmount, setPaidAmount] = useState<number>(initialPaid)
    const [remainingAmount, setRemainingAmount] = useState<number>(initialRemaining)
    const [invoiceNotes, setInvoiceNotes] = useState<string>(order.invoiceNotes || order.comment || '')

    // Dynamic calculations
    const itemsSubtotal = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0)
    const computedTotal = Math.max(0, itemsSubtotal + Number(shippingFees) - Number(discount))

    // Handle Item changes
    const updateItem = (index: number, field: keyof InvoiceItemData, val: any) => {
        const next = [...items]
        next[index] = { ...next[index], [field]: val }
        setItems(next)

        // Recompute remaining when items change
        const nextSubtotal = next.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0)
        const nextTotal = Math.max(0, nextSubtotal + Number(shippingFees) - Number(discount))
        setRemainingAmount(Math.max(0, nextTotal - paidAmount))
    }

    const addItem = () => {
        setItems([...items, {
            id: `new-${Date.now()}`,
            title: 'Nouvel article',
            quantity: 1,
            price: 50,
            type: 'BOOK'
        }])
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            showNotification('La facture doit comporter au moins un article', 'error')
            return
        }
        const next = items.filter((_, i) => i !== index)
        setItems(next)
        const nextSubtotal = next.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0)
        const nextTotal = Math.max(0, nextSubtotal + Number(shippingFees) - Number(discount))
        setRemainingAmount(Math.max(0, nextTotal - paidAmount))
    }

    // Mutual update for Paid vs Remaining
    const handlePaidChange = (newPaid: number) => {
        const p = isNaN(newPaid) ? 0 : Math.max(0, newPaid)
        setPaidAmount(p)
        const rem = Math.max(0, computedTotal - p)
        setRemainingAmount(rem)
        setIsPaid(rem <= 0)
    }

    const handleRemainingChange = (newRemaining: number) => {
        const r = isNaN(newRemaining) ? 0 : Math.max(0, newRemaining)
        setRemainingAmount(r)
        const p = Math.max(0, computedTotal - r)
        setPaidAmount(p)
        setIsPaid(r <= 0)
    }

    // Save to Database
    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await saveOrderInvoice({
                orderId: order.id,
                invoiceNumber,
                invoiceDate,
                fullName,
                phone,
                address,
                city,
                email,
                paymentMethod,
                isPaid,
                paidAmount,
                remainingAmount,
                shippingFees,
                discount,
                total: computedTotal,
                invoiceNotes,
                items
            })

            if (res.success) {
                showNotification('Facture enregistrée avec succès !', 'success')
                router.refresh()
            } else {
                showNotification(res.error || 'Erreur lors de la sauvegarde', 'error')
            }
        } catch (e: any) {
            showNotification(e.message || 'Erreur inattendue', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Print Invoice / Export PDF
    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            alert('Veuillez autoriser les fenêtres contextuelles (pop-ups) pour imprimer la facture.')
            return
        }

        const itemsRows = items.map((it, idx) => `
            <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
                    <strong>${it.title}</strong>
                    <div style="font-size: 11px; color: #64748b;">Réf: ${it.id?.slice(0, 8) || `ART-${idx + 1}`}</div>
                </td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; font-weight: 600;">
                    ${it.quantity}
                </td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 600;">
                    ${Number(it.price).toFixed(2)} DH
                </td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">
                    ${(Number(it.price) * Number(it.quantity)).toFixed(2)} DH
                </td>
            </tr>
        `).join('')

        const html = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="utf-8">
                <title>Facture_${invoiceNumber}_${fullName.replace(/\s+/g, '_')}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        margin: 0;
                        padding: 30px;
                        max-width: 820px;
                        margin: 0 auto;
                        font-size: 13px;
                        line-height: 1.5;
                    }
                    @media print {
                        body { padding: 15px; max-width: 100%; }
                        .no-print { display: none !important; }
                    }
                    .header-table { width: 100%; margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
                    .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; text-transform: uppercase; }
                    .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                    .invoice-badge { text-align: right; }
                    .invoice-title { font-size: 24px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 0; }
                    .invoice-meta { font-size: 12px; color: #475569; margin-top: 4px; font-weight: 500; }
                    
                    .parties-table { width: 100%; margin-bottom: 25px; }
                    .card-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
                    .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; color: #0284c7; margin-bottom: 6px; }
                    
                    table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                    table.items-table th { background: #0f172a; color: #ffffff; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                    
                    .totals-wrapper { width: 100%; display: flex; justify-content: flex-end; margin-bottom: 25px; }
                    .totals-table { width: 340px; border-collapse: collapse; margin-left: auto; }
                    .totals-table td { padding: 7px 12px; font-size: 13px; }
                    .totals-table .border-top { border-top: 1px solid #cbd5e1; }
                    .total-final { font-size: 16px; font-weight: 900; background: #f1f5f9; color: #0f172a; }
                    .paid-row { font-size: 13px; font-weight: 700; color: #059669; }
                    .remaining-row { font-size: 16px; font-weight: 900; color: #dc2626; background: #fee2e2; border-radius: 6px; }
                    
                    .notes-box { background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 10px; padding: 12px 16px; margin-bottom: 25px; font-size: 12px; color: #92400e; }
                    .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                    .print-btn-bar { margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; }
                    .btn-print { background: #0f172a; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="no-print print-btn-bar">
                    <button class="btn-print" onclick="window.print()">🖨️ Imprimer / Télécharger en PDF</button>
                </div>

                <table class="header-table">
                    <tr>
                        <td style="vertical-align: top;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <img src="${companyLogo}" alt="Riwaya Logo" style="height: 42px; width: auto; object-fit: contain; display: inline-block; vertical-align: middle;" />
                                <div>
                                    <div class="brand" style="line-height: 1.1;">${companyName}</div>
                                    <div class="brand-sub">Librairie & Édition • Maroc</div>
                                </div>
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                ${companyAddress} • Tél: ${companyPhone} • ${companyEmail}
                                ${companyIce ? `<br>ICE: ${companyIce}` : ''}
                            </div>
                        </td>
                        <td class="invoice-badge" style="vertical-align: top;">
                            <h1 class="invoice-title">FACTURE</h1>
                            <div class="invoice-meta"><strong>N° :</strong> ${invoiceNumber}</div>
                            <div class="invoice-meta"><strong>Date :</strong> ${new Date(invoiceDate).toLocaleDateString('fr-FR')}</div>
                            <div class="invoice-meta"><strong>Réf Commande :</strong> #${order.id.slice(0, 8).toUpperCase()}</div>
                            <div class="invoice-meta"><strong>Paiement :</strong> ${paymentMethod}</div>
                        </td>
                    </tr>
                </table>

                <table class="parties-table">
                    <tr>
                        <td style="width: 48%; vertical-align: top;">
                            <div class="card-box">
                                <div class="card-title">ÉMETTEUR</div>
                                <strong>${companyName}</strong><br>
                                ${companyAddress}<br>
                                Tél : ${companyPhone}<br>
                                Email : ${companyEmail}
                            </div>
                        </td>
                        <td style="width: 4%;"></td>
                        <td style="width: 48%; vertical-align: top;">
                            <div class="card-box">
                                <div class="card-title">FACTURÉ À (CLIENT)</div>
                                <strong>${fullName || 'Client Anonyme'}</strong><br>
                                ${address || 'Adresse non spécifiée'}<br>
                                Ville : <strong>${city || 'Maroc'}</strong><br>
                                Tél : <strong>${phone || '-'}</strong>
                                ${email ? `<br>Email : ${email}` : ''}
                            </div>
                        </td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align: left; border-top-left-radius: 8px;">Désignation / Article</th>
                            <th style="text-align: center; width: 80px;">Quantité</th>
                            <th style="text-align: right; width: 110px;">Prix Unitaire</th>
                            <th style="text-align: right; width: 120px; border-top-right-radius: 8px;">Total Ligne</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="totals-wrapper">
                    <table class="totals-table">
                        <tr>
                            <td>Sous-total articles :</td>
                            <td style="text-align: right; font-weight: 600;">${itemsSubtotal.toFixed(2)} DH</td>
                        </tr>
                        ${Number(shippingFees) > 0 ? `
                            <tr>
                                <td>Frais de livraison :</td>
                                <td style="text-align: right; font-weight: 600;">+${Number(shippingFees).toFixed(2)} DH</td>
                            </tr>
                        ` : `
                            <tr>
                                <td>Livraison :</td>
                                <td style="text-align: right; color: #059669; font-weight: bold;">Gratuite</td>
                            </tr>
                        `}
                        ${Number(discount) > 0 ? `
                            <tr>
                                <td>Remise accordée :</td>
                                <td style="text-align: right; color: #dc2626; font-weight: 600;">-${Number(discount).toFixed(2)} DH</td>
                            </tr>
                        ` : ''}
                        <tr class="total-final border-top">
                            <td><strong>TOTAL À PAYER :</strong></td>
                            <td style="text-align: right;"><strong>${computedTotal.toFixed(2)} DH</strong></td>
                        </tr>
                        <tr class="paid-row border-top">
                            <td>Montant Déjà Réglé (Acompte) :</td>
                            <td style="text-align: right;">${paidAmount.toFixed(2)} DH</td>
                        </tr>
                        <tr class="remaining-row">
                            <td style="padding: 10px 12px;"><strong>RESTE À PAYER :</strong></td>
                            <td style="text-align: right; padding: 10px 12px;"><strong>${remainingAmount.toFixed(2)} DH</strong></td>
                        </tr>
                    </table>
                </div>

                ${invoiceNotes ? `
                    <div class="notes-box">
                        <strong>📌 Conditions & Notes :</strong><br>
                        ${invoiceNotes.replace(/\n/g, '<br>')}
                    </div>
                ` : ''}

                <div class="footer">
                    Merci pour votre confiance ! Pour toute question, contactez notre service client au ${companyPhone}.<br>
                    Document généré électroniquement par le système de gestion Riwaya Store le ${new Date().toLocaleDateString('fr-FR')}.
                </div>

                <script>
                    window.onload = function() {
                        // Optionnel : auto impression si souhaité
                    }
                </script>
            </body>
            </html>
        `

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
    }

    // Share Invoice details via WhatsApp
    const handleShareWhatsApp = () => {
        if (!phone) {
            showNotification('Veuillez renseigner le numéro de téléphone du client', 'error')
            return
        }

        let cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10 && (cleanPhone.startsWith('06') || cleanPhone.startsWith('07') || cleanPhone.startsWith('05'))) {
            cleanPhone = '212' + cleanPhone.slice(1)
        } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9 && (cleanPhone.startsWith('5') || cleanPhone.startsWith('6') || cleanPhone.startsWith('7'))) {
            cleanPhone = '212' + cleanPhone
        }

        const itemsSummary = items.map(it => `• ${it.quantity}x ${it.title} (${(Number(it.price) * Number(it.quantity)).toFixed(0)} DH)`).join('\n')
        const trackingLink = `https://riwaya.store/${locale}/track/${order.id}`

        const message = 
            `Bonjour *${fullName}*,\n\n` +
            `Voici le récapitulatif de votre commande & facture *#${invoiceNumber}* chez *Riwaya* 📚 :\n\n` +
            `${itemsSummary}\n\n` +
            (Number(shippingFees) > 0 ? `🚚 Frais de livraison : ${shippingFees} DH\n` : `🚚 Livraison : Offerte\n`) +
            (Number(discount) > 0 ? `🎁 Remise : -${discount} DH\n` : '') +
            `💰 *Montant Total : ${computedTotal.toFixed(2)} DH*\n` +
            `✅ *Acompte Payé : ${paidAmount.toFixed(2)} DH*\n` +
            `💵 *RESTE À PAYER À LA LIVRAISON : ${remainingAmount.toFixed(2)} DH*\n\n` +
            `📍 Adresse : ${address}, ${city}\n\n` +
            `🔗 Suivre votre colis en direct : ${trackingLink}\n\n` +
            `Merci de votre confiance et bonne lecture ! ✨`

        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <>
            {children ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {children}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={triggerClassName || "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm"}
                    title="Gérer la facturation et le reste à payer"
                >
                    <FileText className="w-4 h-4" />
                    <span>{triggerText || "Facturation & Reste"}</span>
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        Système de Facturation
                                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Tous les champs sont modifiables. Calcul automatique du montant restant.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-200/60 rounded-xl transition-colors text-gray-400 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
                            {/* Summary alert banner */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                                    <p className="text-xs font-black uppercase text-blue-600 tracking-wider">Total Commande</p>
                                    <p className="text-2xl font-black text-blue-950 mt-1">{computedTotal.toFixed(2)} DH</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                                    <p className="text-xs font-black uppercase text-emerald-600 tracking-wider">Montant Payé / Acompte</p>
                                    <p className="text-2xl font-black text-emerald-950 mt-1">{paidAmount.toFixed(2)} DH</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                                    <p className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" /> Reste à Payer (COD)
                                    </p>
                                    <p className="text-2xl font-black text-red-600 mt-1">{remainingAmount.toFixed(2)} DH</p>
                                </div>
                            </div>

                            {/* Section 1: Métadonnées Facture & Paiement */}
                            <div className="p-5 rounded-2xl border border-gray-200/80 bg-white space-y-4">
                                <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                    Paramètres de la Facture & Règlement
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">N° de Facture</label>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date Facture</label>
                                        <input
                                            type="date"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Mode de Paiement</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="COD">Paiement à la livraison (COD)</option>
                                            <option value="BANK_TRANSFER">Virement Bancaire</option>
                                            <option value="CASH_PLUS">Cash Plus / Wafacash</option>
                                            <option value="STRIPE">Carte Bancaire (En ligne)</option>
                                            <option value="CASH">Espèces au magasin (POS)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Statut Règlement</label>
                                        <select
                                            value={isPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (v === 'PAID') {
                                                    setIsPaid(true)
                                                    setPaidAmount(computedTotal)
                                                    setRemainingAmount(0)
                                                } else if (v === 'UNPAID') {
                                                    setIsPaid(false)
                                                    setPaidAmount(0)
                                                    setRemainingAmount(computedTotal)
                                                } else {
                                                    setIsPaid(false)
                                                }
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="UNPAID">❌ Non Payé (100% à la livraison)</option>
                                            <option value="PARTIAL">⚠️ Acompte Payé (Partiel)</option>
                                            <option value="PAID">✅ Entièrement Payé</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Destinataire (Client) & Émetteur */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border border-gray-200/80 bg-white space-y-3">
                                    <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-blue-600" /> Facturé à (Client)
                                    </h3>
                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Nom & Prénom</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:bg-white outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase">Téléphone</label>
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase">Ville</label>
                                                <input
                                                    type="text"
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Adresse</label>
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-gray-200/80 bg-white space-y-3">
                                    <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-emerald-600" /> Émetteur (Vendeur)
                                    </h3>
                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Entreprise</label>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:bg-white outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase">Téléphone</label>
                                                <input
                                                    type="text"
                                                    value={companyPhone}
                                                    onChange={(e) => setCompanyPhone(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase">ICE</label>
                                                <input
                                                    type="text"
                                                    value={companyIce}
                                                    onChange={(e) => setCompanyIce(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Adresse Émetteur</label>
                                            <input
                                                type="text"
                                                value={companyAddress}
                                                onChange={(e) => setCompanyAddress(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Lignes de la Facture (Articles) */}
                            <div className="p-5 rounded-2xl border border-gray-200/80 bg-white space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                                        Articles Facturés ({items.length})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Ajouter une ligne
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {items.map((it, idx) => (
                                        <div 
                                            key={it.id || idx} 
                                            className="grid grid-cols-12 gap-2.5 items-center p-2.5 bg-gray-50/70 border border-gray-200/70 rounded-xl hover:border-gray-300 transition-colors"
                                        >
                                            <div className="col-span-6">
                                                <input
                                                    type="text"
                                                    value={it.title}
                                                    onChange={(e) => updateItem(idx, 'title', e.target.value)}
                                                    placeholder="Désignation article"
                                                    className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={it.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                    placeholder="Qté"
                                                    className="w-full px-2 py-1.5 text-sm text-center font-bold bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    value={it.price}
                                                    onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                                    placeholder="Prix (DH)"
                                                    className="w-full px-2 py-1.5 text-sm text-right font-bold bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div className="col-span-1 text-right text-xs font-black text-gray-900">
                                                {((Number(it.price) || 0) * (Number(it.quantity) || 0)).toFixed(0)} DH
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Supprimer la ligne"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Totaux & Reste à payer */}
                            <div className="p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 space-y-4">
                                <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-700" />
                                    Totaux, Acompte & Reste à Payer (Modifiables)
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                            Frais de Livraison (DH)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={shippingFees}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value) || 0
                                                setShippingFees(v)
                                                const nextTotal = Math.max(0, itemsSubtotal + v - Number(discount))
                                                setRemainingAmount(Math.max(0, nextTotal - paidAmount))
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                            Remise / Réduction (DH)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={discount}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value) || 0
                                                setDiscount(v)
                                                const nextTotal = Math.max(0, itemsSubtotal + Number(shippingFees) - v)
                                                setRemainingAmount(Math.max(0, nextTotal - paidAmount))
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                                        <span className="block text-[11px] font-black uppercase text-emerald-700">Total TTC Calculé</span>
                                        <span className="text-xl font-black text-gray-900">{computedTotal.toFixed(2)} DH</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-200/80">
                                    <div className="p-4 rounded-xl bg-white border-2 border-emerald-300 shadow-sm">
                                        <label className="block text-xs font-black uppercase text-emerald-800 mb-1">
                                            Montant Payé / Acompte (DH)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={paidAmount}
                                            onChange={(e) => handlePaidChange(parseFloat(e.target.value))}
                                            placeholder="Ex: 50"
                                            className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-lg font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">Montant déjà versé par le client (virement, acompte...).</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white border-2 border-red-300 shadow-sm">
                                        <label className="block text-xs font-black uppercase text-red-700 mb-1">
                                            Reste à Payer à la Livraison (DH)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={remainingAmount}
                                            onChange={(e) => handleRemainingChange(parseFloat(e.target.value))}
                                            placeholder="Ex: 150"
                                            className="w-full px-3.5 py-2.5 bg-red-50/50 border border-red-300 rounded-lg text-lg font-black text-red-700 outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">Montant restant que le transporteur devra encaisser.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                        Notes & Conditions sur la Facture (Affichées au bas de la facture)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={invoiceNotes}
                                        onChange={(e) => setInvoiceNotes(e.target.value)}
                                        placeholder="Ex: Reste à régler en espèces à la livraison. Livraison garantie 24-48h."
                                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer with Actions */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-black transition-colors shadow-sm"
                                >
                                    <Printer className="w-4 h-4" />
                                    Imprimer / PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShareWhatsApp}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    <Share2 className="w-4 h-4" />
                                    WhatsApp Client
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200/70 transition-colors"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Enregistrer la Facture
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
