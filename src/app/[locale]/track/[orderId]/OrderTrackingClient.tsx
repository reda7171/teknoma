'use client'

import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronLeft, XCircle } from 'lucide-react'
import Link from 'next/link'

interface OrderTrackingClientProps {
    order: any
    shippingCompany: any
    locale: string
}

export default function OrderTrackingClient({ order, shippingCompany, locale }: OrderTrackingClientProps) {
    // Determine current step index
    const statusOrder = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
    const currentIndex = statusOrder.indexOf(order.status)
    const isCancelled = order.status === 'CANCELLED'
    const isReturned = order.status === 'RETURNED'

    const getStepStatus = (stepIndex: number) => {
        if (isCancelled || isReturned) {
            if (stepIndex === 0) return 'completed'
            return 'inactive'
        }
        if (currentIndex > stepIndex) return 'completed'
        if (currentIndex === stepIndex) return 'current'
        return 'inactive'
    }

    const steps = [
        { id: 'PENDING', title: 'Commande Reçue', icon: Clock },
        { id: 'CONFIRMED', title: 'En Préparation', icon: Package },
        { id: 'SHIPPED', title: 'Expédiée', icon: Truck },
        { id: 'DELIVERED', title: 'Livrée', icon: CheckCircle2 },
    ]

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href={`/${locale}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                        <ChevronLeft className="w-5 h-5" />
                        Retour à la boutique
                    </Link>
                    <img src="/logo.png" alt="Riwaya" className="h-8" />
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-black"></div>
                    
                    <div className="mb-10">
                        <h1 className="text-2xl font-black text-gray-900">Suivi de commande</h1>
                        <p className="text-gray-500 mt-2">
                            Commande <span className="font-mono font-bold text-gray-900">#{order.id.split('-')[0].toUpperCase()}</span>
                            {' • '}
                            Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                    </div>

                    {/* Alert for Cancelled/Returned */}
                    {(isCancelled || isReturned) && (
                        <div className="mb-8 p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-600" />
                            <div>
                                <p className="font-bold">
                                    {isCancelled ? 'Commande Annulée' : 'Commande Retournée'}
                                </p>
                                <p className="text-sm">Cette commande a été {isCancelled ? 'annulée' : 'retournée'}.</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {!isCancelled && !isReturned && (
                        <div className="relative mb-16 mt-8">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-black transition-all duration-500 ease-in-out"
                                    style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
                                ></div>
                            </div>
                            
                            <div className="relative flex justify-between">
                                {steps.map((step, index) => {
                                    const status = getStepStatus(index)
                                    const Icon = step.icon
                                    
                                    return (
                                        <div key={step.id} className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors duration-300 ${
                                                status === 'completed' ? 'bg-black text-white' :
                                                status === 'current' ? 'bg-white border-2 border-black text-black' :
                                                'bg-white border-2 border-gray-200 text-gray-300'
                                            }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <p className={`mt-3 text-xs font-bold uppercase tracking-wider ${
                                                status === 'inactive' ? 'text-gray-400' : 'text-gray-900'
                                            }`}>
                                                {step.title}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Shipping Info */}
                    {shippingCompany && order.trackingID && (
                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6 justify-between border border-gray-100">
                            <div className="flex items-center gap-4">
                                {shippingCompany.logo ? (
                                    <img src={shippingCompany.logo} alt={shippingCompany.name} className="h-10 object-contain" />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-gray-500" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Transporteur</p>
                                    <p className="font-bold text-gray-900">{shippingCompany.name}</p>
                                </div>
                            </div>
                            
                            <div className="text-left sm:text-right">
                                <p className="text-sm text-gray-500 font-medium">N° de Suivi</p>
                                <p className="font-mono font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-200 mt-1 inline-block">
                                    {order.trackingID}
                                </p>
                            </div>
                            
                            {shippingCompany.trackingUrl && (
                                <a 
                                    href={shippingCompany.trackingUrl.replace('{trackingID}', order.trackingID)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors whitespace-nowrap"
                                >
                                    Suivre sur leur site
                                </a>
                            )}
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-sm">Détails des articles</h3>
                        <div className="space-y-4">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-4 py-2">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        {(item.book?.image || item.pack?.image) ? (
                                            <img src={item.book?.image || item.pack?.image} alt="Produit" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 line-clamp-1">{item.book?.title || item.pack?.name || 'Produit'}</p>
                                        <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                                    </div>
                                    <div className="font-black text-gray-900">
                                        {(item.price * item.quantity).toFixed(2)} Dhs
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-gray-100 pt-6 mt-6">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Sous-total</span>
                            <span className="font-medium">{(order.subtotal || order.total - order.shippingFees + order.discount).toFixed(2)} Dhs</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Livraison</span>
                            <span className="font-medium">{order.shippingFees.toFixed(2)} Dhs</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="flex justify-between text-sm mb-4 text-green-600">
                                <span>Remise</span>
                                <span className="font-medium">-{order.discount.toFixed(2)} Dhs</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black text-gray-900 pt-4 border-t border-gray-100">
                            <span>Total</span>
                            <span>{order.total.toFixed(2)} Dhs</span>
                        </div>
                    </div>
                </div>
                
                {/* Need help? */}
                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Besoin d'aide avec votre commande ?{' '}
                        <a href="mailto:contact@riwaya.store" className="font-bold text-black hover:underline">
                            Contactez-nous
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
