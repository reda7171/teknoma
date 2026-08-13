'use client'

import React, { useEffect, useState, useRef } from 'react'
import { X, PackageSearch, CheckCircle, AlertCircle, RefreshCcw, Search } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
    const router = useRouter()
    const [scannedCode, setScannedCode] = useState<string | null>(null)
    const [manualCode, setManualCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [order, setOrder] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)

    useEffect(() => {
        if (!isOpen) {
            // Clean up scanner if closed
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error)
                scannerRef.current = null
            }
            // Reset state
            setScannedCode(null)
            setManualCode("")
            setOrder(null)
            setError(null)
            setSuccess(null)
            return
        }

        // Initialize scanner when modal opens and no order is found yet
        if (isOpen && !order && !scannedCode) {
            startScanner()
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error)
                scannerRef.current = null
            }
        }
    }, [isOpen, order, scannedCode])

    const startScanner = () => {
        // Ensure DOM element exists before initializing
        setTimeout(() => {
            const element = document.getElementById('reader')
            if (!element) return

            if (!scannerRef.current) {
                scannerRef.current = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
                    /* verbose= */ false
                )
                
                scannerRef.current.render(onScanSuccess, onScanFailure)
            }
        }, 100)
    }

    const onScanSuccess = async (decodedText: string) => {
        if (scannedCode === decodedText) return
        
        // Stop scanner once we get a code
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error)
            scannerRef.current = null
        }

        setScannedCode(decodedText)
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/admin/scan-return/find?trackingID=${encodeURIComponent(decodedText)}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Commande introuvable")
            }

            setOrder(data.order)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const onScanFailure = (error: any) => {
        // Ignore normal scan failures (happens every frame)
    }

    const handleDeclareReturn = async () => {
        if (!order) return
        
        setLoading(true)
        setError(null)
        
        try {
            const res = await fetch(`/api/admin/scan-return/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erreur lors du retour")
            }

            setSuccess("Commande retournée avec succès. Le stock a été mis à jour.")
            router.refresh() // Refresh dashboard/orders data
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetScanner = () => {
        setScannedCode(null)
        setManualCode("")
        setOrder(null)
        setError(null)
        setSuccess(null)
        startScanner()
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualCode.trim()) {
            onScanSuccess(manualCode.trim())
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <PackageSearch className="w-5 h-5 text-blue-600" />
                        Scan Retour (Withyou)
                    </h3>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!scannedCode && !order && (
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-bold text-gray-500 mb-4 text-center">
                                Placez le code QR de livraison Withyou devant la caméra.
                            </p>
                            <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-gray-200 bg-black"></div>
                            
                            <div className="w-full max-w-sm mx-auto mt-6">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OU</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                </div>
                                <form onSubmit={handleManualSubmit} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Entrer le numéro manuellement" 
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!manualCode.trim()}
                                        className="px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-sm font-bold text-gray-500">Traitement en cours...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 flex flex-col items-center text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                            <h4 className="font-black text-lg mb-2">Erreur</h4>
                            <p className="font-medium text-sm">{error}</p>
                            {scannedCode && (
                                <p className="text-xs text-red-500 mt-2 font-mono">Code scanné : {scannedCode}</p>
                            )}
                            <button onClick={resetScanner} className="mt-6 px-6 py-2 bg-red-100 text-red-700 font-bold rounded-full hover:bg-red-200 transition-colors flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4" /> Réessayer
                            </button>
                        </div>
                    )}

                    {!loading && success && (
                        <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                            <h4 className="font-black text-lg mb-2">Succès !</h4>
                            <p className="font-medium text-sm">{success}</p>
                            <button onClick={resetScanner} className="mt-6 px-6 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-full hover:bg-emerald-200 transition-colors flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4" /> Scanner un autre retour
                            </button>
                        </div>
                    )}

                    {!loading && !error && !success && order && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <h4 className="font-black text-lg text-gray-900 mb-1">Commande #{order.id.slice(0, 8)}</h4>
                                <p className="text-sm text-gray-600 font-medium">Client: <span className="font-bold text-gray-900">{order.customer?.fullName || order.fullName}</span></p>
                                <p className="text-sm text-gray-600 font-medium">Téléphone: <span className="font-bold text-gray-900">{order.customer?.phone || order.phone}</span></p>
                                <p className="text-sm text-gray-600 font-medium">Total: <span className="font-black text-blue-600">{order.total} درهم</span></p>
                            </div>

                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Articles de la commande</h5>
                                <div className="space-y-3">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            {item.type === 'BOOK' && item.book && (
                                                <>
                                                    <div className="w-10 h-14 bg-gray-200 rounded-md overflow-hidden relative flex-shrink-0">
                                                        {item.book.image && <Image src={item.book.image} alt={item.book.title} fill className="object-cover" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{item.book.title}</p>
                                                        <p className="text-xs text-gray-500 font-medium">Quantité: {item.quantity}</p>
                                                    </div>
                                                </>
                                            )}
                                            {item.type === 'PACK' && item.pack && (
                                                <>
                                                    <div className="w-10 h-14 bg-gray-200 rounded-md overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                                                        <PackageSearch className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{item.pack.name}</p>
                                                        <p className="text-xs text-gray-500 font-medium">Quantité: {item.quantity} ({item.pack.books?.length || 0} livres)</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-orange-800 leading-relaxed">
                                    Attention : En déclarant ce retour, le statut de la commande passera à "Retournée" et le stock des articles sera automatiquement incrémenté.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={resetScanner}
                                    className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleDeclareReturn}
                                    className="px-6 py-2.5 bg-black text-white text-sm font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                >
                                    Déclarer Retour
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
