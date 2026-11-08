'use client'

import Script from 'next/script'
import { createContext, useContext, type ComponentProps } from 'react'

export const CspNonceContext = createContext<string | undefined>(undefined)

export function CspNonceProvider({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
    return <CspNonceContext.Provider value={nonce}>{children}</CspNonceContext.Provider>
}

export default function CspScript(props: ComponentProps<typeof Script>) {
    const nonce = useContext(CspNonceContext)
    return <Script {...props} nonce={nonce} />
}
