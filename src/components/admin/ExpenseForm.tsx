'use client'

import { useState, useEffect } from 'react'
import { createExpense, updateExpense, getUninvoicedDeliveredOrders } from '@/lib/actions/finance'
import { ExpenseCategory, TransactionType } from '@prisma/client'
import { Plus, Loader2, Calculator, Edit2, Package } from 'lucide-react'

const EXPENSE_CATEGORIES = [
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'ADS', label: 'Publicité (Ads)' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'BOOKS_PURCHASE', label: 'Achat Livres' },
    { value: 'PACKAGING', label: 'Emballage' },
    { value: 'SALARIES', label: 'Salaires' },
    { value: 'OFFICE', label: 'Bureau & Fournitures' },
    { value: 'GIFTS', label: 'Cadeaux' },
    { value: 'CASHOUT', label: 'Cash out' },
    { value: 'OTHER', label: 'Autre' }
]

const INCOME_CATEGORIES = [
    { value: 'INCOME_CASH', label: 'Cash (Livraison)' },
    { value: 'INCOME_DELIVERY', label: 'Facture Société de Livraison' },
    { value: 'INCOME_JUMIA', label: 'Virement Jumia' },
    { value: 'OTHER', label: 'Autre Entrée' }
]

export default function ExpenseForm({ expense }: { expense?: any }) {
    const isEditing = !!expense
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [type, setType] = useState<TransactionType>(expense?.type || 'EXPENSE')
    const [selectedCategory, setSelectedCategory] = useState<string>(expense?.category || 'TRANSPORT')
    const [isLot, setIsLot] = useState(!!expense?.unitCost)

    // Automatically update default category when type changes
    useEffect(() => {
        if (!isEditing) {
            setSelectedCategory(type === 'INCOME' ? 'INCOME_CASH' : 'TRANSPORT')
        }
    }, [type, isEditing])

    // Form fields
    const [title, setTitle] = useState(expense?.title || '')
    const [amount, setAmount] = useState<number | string>(expense?.amount || '')
    const [description, setDescription] = useState(expense?.description || '')
    const [date, setDate] = useState<string>(
        expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    )
    const [bookCount, setBookCount] = useState<number | string>('')
    const [booksCost, setBooksCost] = useState<number | string>('')
    const [transportCost, setTransportCost] = useState<number | string>(0)
    const [error, setError] = useState('')

    const totalLotCost = (Number(booksCost) || 0) + (Number(transportCost) || 0)
    const averagePrice = Number(bookCount) > 0 ? (totalLotCost / Number(bookCount)) : 0

    // Commandes pour Facture Société de Livraison
    const [availableOrders, setAvailableOrders] = useState<any[]>([])
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [rawDeliveryText, setRawDeliveryText] = useState('')
    const [parsedDeliveryFrais, setParsedDeliveryFrais] = useState(0)
    const [parsedOrderFraisMap, setParsedOrderFraisMap] = useState<Record<string, number>>({})
    const [orderSearch, setOrderSearch] = useState('')

    useEffect(() => {
        if (type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY') {
            setLoadingOrders(true)
            getUninvoicedDeliveredOrders(expense?.id).then(orders => {
                setAvailableOrders(orders)
                if (isEditing && expense?.id) {
                    setSelectedOrderIds(orders.filter((o: any) => o.expenseId === expense.id).map((o: any) => o.id))
                }
                setLoadingOrders(false)
            }).catch(() => setLoadingOrders(false))
        } else {
            setAvailableOrders([])
            if (!isEditing) setSelectedOrderIds([])
        }
    }, [type, selectedCategory, isEditing, expense?.id])

    // Parse delivery company text to auto-select orders and calculate net amount
    useEffect(() => {
        if (type !== 'INCOME' || selectedCategory !== 'INCOME_DELIVERY') return
        
        if (!rawDeliveryText) {
            setSelectedOrderIds([])
            setParsedDeliveryFrais(0)
            setParsedOrderFraisMap({})
            return
        }
        
        // Flatten text to ignore all newlines which cause split lines
        const flatText = rawDeliveryText.replace(/\r?\n/g, ' ')
        const flatTokens = flatText.split(/\s+/)
        
        let parsedOrderIds: string[] = []
        let totalFrais = 0
        let orderFraisMap: Record<string, number> = {}
        
        availableOrders.forEach(order => {
            let matchedIndex = -1
            const idIndex = flatTokens.indexOf(order.id)
            if (idIndex !== -1) {
                matchedIndex = idIndex
            } else if (order.trackingID && order.trackingID.length > 4) {
                const trackingIndex = flatTokens.indexOf(order.trackingID)
                if (trackingIndex !== -1) {
                    matchedIndex = trackingIndex
                }
            }

            if (matchedIndex !== -1) {
                parsedOrderIds.push(order.id)
                // Cherche les 2 prochains nombres après l'ID (généralement Prix puis Frais)
                const numbersFound: number[] = []
                for (let i = matchedIndex + 1; i < Math.min(matchedIndex + 12, flatTokens.length); i++) {
                    const token = flatTokens[i]
                    if (/^\d+([.,]\d+)?$/.test(token)) {
                        numbersFound.push(parseFloat(token.replace(',', '.')))
                    }
                }
                
                // Si on trouve au moins 2 nombres, le 2ème est le Frais. Sinon le 1er.
                const frais = numbersFound.length >= 2 ? numbersFound[1] : numbersFound[0]
                if (frais !== undefined && !isNaN(frais)) {
                    totalFrais += frais
                    orderFraisMap[order.id] = frais
                }
            }
        })
        
        if (parsedOrderIds.length > 0) {
            setSelectedOrderIds(parsedOrderIds)
            setParsedDeliveryFrais(totalFrais)
            setParsedOrderFraisMap(orderFraisMap)
        }
    }, [rawDeliveryText, availableOrders, type, selectedCategory])

    // Auto-calculate amount when orders are selected
    useEffect(() => {
        if (type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY') {
            const total = selectedOrderIds.reduce((sum, id) => {
                const order = availableOrders.find(o => o.id === id)
                return sum + (order?.total || 0)
            }, 0)

            const totalFrais = parsedDeliveryFrais > 0 ? parsedDeliveryFrais : selectedOrderIds.reduce((sum, id) => {
                const order = availableOrders.find(o => o.id === id)
                return sum + (order?.shippingFees || 0)
            }, 0)

            const netAmount = total - totalFrais
            
            // Ne met à jour automatiquement que si on n'est pas en train d'éditer,
            // OU si une modification manuelle (sélection ou texte) a été effectuée
            if (!isEditing || parsedDeliveryFrais > 0 || (selectedOrderIds.length > 0 && availableOrders.length > 0)) {
                // On met à jour si le net est positif, et on évite d'écraser inutilement à l'ouverture si c'est identique
                setAmount(netAmount > 0 ? netAmount : '')
            }
        }
    }, [selectedOrderIds, availableOrders, type, selectedCategory, isEditing, parsedDeliveryFrais])

    const toggleOrderSelection = (id: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const selectAllOrders = () => {
        if (selectedOrderIds.length === availableOrders.length) {
            setSelectedOrderIds([])
        } else {
            setSelectedOrderIds(availableOrders.map(o => o.id))
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')
        
        let finalAmount = parseFloat(amount as string)
        let finalDescription = description

        if (type === 'EXPENSE' && selectedCategory === 'BOOKS_PURCHASE' && isLot && bookCount && booksCost) {
            finalAmount = totalLotCost
            const lotDetails = `Lot de ${bookCount} livres. Prix moyen de revient: ${averagePrice.toFixed(2)} درهم/livre. (Livres: ${booksCost || 0} درهم, Transport: ${transportCost || 0} درهم).`
            finalDescription = description ? `${lotDetails} | ${description}` : lotDetails
            finalDescription = description ? `${lotDetails} | ${description}` : lotDetails
        }
        
        if (type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY' && selectedOrderIds.length > 0) {
            const orderDetails = `Facture de livraison pour ${selectedOrderIds.length} commande(s).`
            finalDescription = description ? `${orderDetails} | ${description}` : orderDetails
        }

        const data = {
            title,
            amount: finalAmount,
            category: selectedCategory as ExpenseCategory,
            type: type,
            description: finalDescription,
            unitCost: (isLot && averagePrice > 0) ? averagePrice : (expense?.unitCost || undefined),
            orderIds: selectedOrderIds.length > 0 ? selectedOrderIds : undefined,
            orderFraisMap: Object.keys(parsedOrderFraisMap).length > 0 ? parsedOrderFraisMap : undefined,
            date: date
        }

        let res: any;
        if (isEditing) {
            res = await updateExpense(expense.id, data)
        } else {
            res = await createExpense(data)
        }
        
        if (res && res.error) {
            setError(res.error)
            setLoading(false)
            return
        }

        if (isEditing) {
            setIsOpen(false)
        } else {
            setTitle('')
            setAmount('')
            setDescription('')
            setType('EXPENSE')
            setSelectedCategory('TRANSPORT')
            setIsLot(false)
            setBookCount('')
            setBooksCost('')
            setTransportCost(0)
            setSelectedOrderIds([])
            setDate(new Date().toISOString().split('T')[0])
            setRawDeliveryText('')
            setParsedDeliveryFrais(0)
            setParsedOrderFraisMap({})
            
            // On recharge les commandes si on est sur la facture de livraison
            if (type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY') {
                getUninvoicedDeliveredOrders().then(orders => {
                    setAvailableOrders(orders)
                })
            }
        }
        
        setLoading(false)
    }

    if (!isOpen) {
        if (isEditing) {
            return (
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-blue-600 hover:bg-blue-50 bg-white rounded-lg border border-blue-100 transition shadow-sm"
                    title="Modifier"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            )
        }

        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
                <Plus className="w-4 h-4" />
                Nouvelle Transaction
            </button>
        )
    }

    const formContent = (
        <>
            <h3 className="font-bold text-lg mb-4 text-gray-800">{isEditing ? 'Modifier la transaction' : 'Ajouter une transaction'}</h3>
            {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm font-bold flex items-center gap-2">
                    <span className="text-xl">⚠️</span> {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Choix du type de transaction */}
                <div className="flex gap-4 p-1 bg-gray-100 rounded-xl w-full max-w-sm">
                    <button
                        type="button"
                        onClick={() => setType('EXPENSE')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'EXPENSE' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sortie (Dépense)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('INCOME')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'INCOME' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Entrée (Revenu)
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
                        <select aria-label="Champ de sélection" 
                            value={selectedCategory} 
                            onChange={e => setSelectedCategory(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            {(type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            {type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY' ? 'N° de Facture' : 'Titre'}
                        </label>
                        <input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            placeholder={type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY' ? 'Ex: FAC-2024-001' : 'Ex: Livraison Rabat'} 
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                        <input 
                            type="date"
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            required 
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        />
                    </div>

                    {/* Achat Livres - Option Lot */}
                    {type === 'EXPENSE' && selectedCategory === 'BOOKS_PURCHASE' && (
                        <div className="md:col-span-2 bg-blue-50 p-4 border border-blue-100 rounded-xl space-y-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isLot}
                                    onChange={(e) => setIsLot(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                                />
                                <span className="font-bold text-blue-900">Il s'agit d'un achat de lot avec calcul du prix de revient</span>
                            </label>

                            {isLot && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Quantité (Nb de livres)</label>
                                        <input 
                                            type="number" 
                                            value={bookCount}
                                            onChange={(e) => setBookCount(e.target.value)}
                                            required={isLot}
                                            min="1"
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" 
                                            placeholder="Ex: 50" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Prix global des livres (درهم)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={booksCost}
                                            onChange={(e) => setBooksCost(e.target.value)}
                                            required={isLot}
                                            min="0"
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" 
                                            placeholder="Ex: 1500" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Frais de transport (درهم)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={transportCost}
                                            onChange={(e) => setTransportCost(e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" 
                                            placeholder="Ex: 50" 
                                        />
                                    </div>

                                    {/* Résultat Calcul */}
                                    <div className="sm:col-span-3 bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                                            <Calculator className="w-4 h-4" />
                                            Coût Total: {totalLotCost.toFixed(2)} درهم
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Prix de revient unitaire</span>
                                            <p className="text-lg font-black text-green-600">{averagePrice.toFixed(2)} درهم <span className="text-xs text-green-500 font-medium tracking-normal">/ livre</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sélection des commandes pour facture livraison */}
                    {type === 'INCOME' && selectedCategory === 'INCOME_DELIVERY' && !isEditing && (
                        <div className="md:col-span-2 bg-emerald-50 p-4 border border-emerald-100 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-900 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Sélectionnez les commandes payées dans cette facture
                                </span>
                                {availableOrders.length > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={selectAllOrders}
                                        className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors"
                                    >
                                        {selectedOrderIds.length === availableOrders.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                                    </button>
                                )}
                            </div>

                            {/* Auto-détection (Copier-coller) */}
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm">
                                <label className="block text-xs font-bold text-emerald-800 mb-2">
                                    Détection automatique (Collez le tableau de la société de livraison ici)
                                </label>
                                <textarea
                                    rows={3}
                                    value={rawDeliveryText}
                                    onChange={(e) => setRawDeliveryText(e.target.value)}
                                    placeholder="Ex: 1 W2853960 Errahma livrer 135 35"
                                    className="w-full px-3 py-2 border rounded-md text-xs font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                />
                                {parsedDeliveryFrais > 0 && (
                                    <p className="mt-2 text-xs font-bold text-emerald-600">
                                        ✓ Détection réussie. Frais totaux détectés : {parsedDeliveryFrais} درهم
                                    </p>
                                )}
                            </div>

                            {loadingOrders ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                </div>
                            ) : availableOrders.length === 0 ? (
                                <p className="text-sm text-emerald-700 text-center py-4">Aucune commande livrée en attente de paiement trouvée.</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Rechercher par nom, téléphone, numéro..."
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="w-full px-4 py-2 border border-emerald-100 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availableOrders
                                            .filter(order => 
                                                orderSearch === '' || 
                                                order.fullName.toLowerCase().includes(orderSearch.toLowerCase()) || 
                                                (order.trackingID && order.trackingID.toLowerCase().includes(orderSearch.toLowerCase())) ||
                                                (order.phone && order.phone.includes(orderSearch)) ||
                                                order.id.includes(orderSearch)
                                            )
                                            .map(order => (
                                            <div 
                                                key={order.id} 
                                                onClick={() => toggleOrderSelection(order.id)}
                                                className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                                                    selectedOrderIds.includes(order.id) 
                                                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' 
                                                        : 'bg-white border-emerald-200 hover:border-emerald-400 text-emerald-900 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3 mb-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedOrderIds.includes(order.id)}
                                                        readOnly
                                                        className="w-4 h-4 mt-1 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                                    />
                                                    <div>
                                                        <p className={`font-bold text-sm ${selectedOrderIds.includes(order.id) ? 'text-white' : 'text-gray-900'}`}>{order.fullName}</p>
                                                        <p className={`text-xs ${selectedOrderIds.includes(order.id) ? 'text-emerald-100' : 'text-gray-500'}`}>
                                                            {order.trackingID || 'Sans numéro'} • {order.shippingCompany || 'Standard'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right mt-auto">
                                                    <p className={`font-black tracking-tight ${selectedOrderIds.includes(order.id) ? 'text-white' : 'text-emerald-700'}`}>
                                                        {order.total.toFixed(2)} درهم
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex justify-between items-center text-emerald-800 font-bold text-sm">
                                <span>{selectedOrderIds.length} commande(s) sélectionnée(s)</span>
                                <span>Total estimé: {(selectedOrderIds.reduce((sum, id) => sum + (availableOrders.find(o => o.id === id)?.total || 0), 0)).toFixed(2)} درهم</span>
                            </div>
                        </div>
                    )}

                    {(!isLot || selectedCategory !== 'BOOKS_PURCHASE') && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Montant Total (درهم)</label>
                                <input 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    type="number" 
                                    step="0.01" 
                                    required={!isLot && selectedCategory !== 'INCOME_DELIVERY'}
                                    readOnly={selectedCategory === 'INCOME_DELIVERY' && selectedOrderIds.length > 0}
                                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-all ${
                                        selectedCategory === 'INCOME_DELIVERY' && selectedOrderIds.length > 0
                                        ? 'bg-gray-100 text-gray-600 cursor-not-allowed font-bold'
                                        : 'bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500'
                                    }`} 
                                    placeholder="0.00" 
                                />
                            </div>
                            
                            {selectedCategory === 'INCOME_DELIVERY' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Frais de livraison (درهم)</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={selectedOrderIds.reduce((sum, id) => sum + (parsedOrderFraisMap[id] !== undefined ? parsedOrderFraisMap[id] : (availableOrders.find(o => o.id === id)?.shippingFees || 0)), 0).toFixed(2)}
                                        readOnly
                                        className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 font-bold outline-none cursor-not-allowed"
                                        placeholder="Ex: 70"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className={isLot && selectedCategory === 'BOOKS_PURCHASE' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optionnel)</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Détails supplémentaires..." />
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 font-bold shadow-sm"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEditing ? 'Mettre à jour' : 'Enregistrer la transaction'}
                    </button>
                </div>
            </form>
        </>
    )

    if (isEditing) {
        return (
            isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {formContent}
                    </div>
                </div>
            ) : null
        )
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
            {formContent}
        </div>
    )
}
