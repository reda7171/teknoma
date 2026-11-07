'use client'

import { CheckoutErrorFallback } from '@/components/checkout/CheckoutErrorBoundary'

export default function CheckoutErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <>
            <meta name="robots" content="noindex, nofollow" />
            <div className="min-h-screen bg-pixio-cream py-8">
                <CheckoutErrorFallback
                    error={error}
                    onReset={() => reset()}
                />
            </div>
        </>
    )
}

