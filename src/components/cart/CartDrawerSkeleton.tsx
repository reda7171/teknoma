import React from 'react'
import { ShoppingCart, X } from 'lucide-react'

interface CartDrawerSkeletonProps {
    onClose?: () => void
}

export default function CartDrawerSkeleton({ onClose }: CartDrawerSkeletonProps) {
    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[170] transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed top-0 right-0 rtl:left-0 rtl:right-auto h-full h-[100dvh] w-full sm:w-[520px] bg-white shadow-[0_0_100px_rgba(0,0,0,0.1)] z-[180] flex flex-col pointer-events-auto"
                aria-hidden="true"
            >
                {/* Indicateur visuel tactile mobile */}
                <div className="sm:hidden pt-2 pb-1 flex justify-center items-center">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-8 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-6 w-28 bg-gray-200 rounded-lg shimmer-placeholder" />
                            <div className="h-3 w-16 bg-gray-100 rounded shimmer-placeholder" />
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fermer"
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                    )}
                </div>

                {/* Content Items Skeleton */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 bg-pixio-cream/30">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex gap-4 p-4 sm:p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm"
                        >
                            {/* Couverture */}
                            <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-2xl bg-gray-100 shimmer-placeholder shrink-0" />

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div className="space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded-md shimmer-placeholder" />
                                    <div className="h-3 w-1/2 bg-gray-100 rounded-md shimmer-placeholder" />
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="h-5 w-20 bg-gray-200 rounded-lg shimmer-placeholder" />
                                    <div className="h-8 w-24 bg-gray-100 rounded-full shimmer-placeholder" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Skeleton */}
                <div className="p-4 sm:p-8 bg-white border-t border-gray-50 space-y-4 pb-safe sm:pb-8">
                    <div className="flex justify-between items-center pt-1">
                        <div className="h-4 w-24 bg-gray-200 rounded shimmer-placeholder" />
                        <div className="h-8 w-28 bg-gray-200 rounded-lg shimmer-placeholder" />
                    </div>
                    <div className="w-full h-14 bg-gray-900 rounded-full shimmer-placeholder" />
                </div>
            </div>
        </>
    )
}
