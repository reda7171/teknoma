'use client'

import { createContext, useContext } from 'react'

// Contexte léger pour partager le logo configuré en base sans fetch client
const SiteLogoContext = createContext<string>('/logo.png')

export function SiteLogoProvider({
  logo,
  children,
}: {
  logo: string
  children: React.ReactNode
}) {
  return <SiteLogoContext.Provider value={logo}>{children}</SiteLogoContext.Provider>
}

export function useSiteLogo(): string {
  return useContext(SiteLogoContext)
}
