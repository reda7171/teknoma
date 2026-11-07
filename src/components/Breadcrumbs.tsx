'use client'

import React from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

export interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
    className?: string
}

export default function Breadcrumbs({ items, className = 'mb-6' }: BreadcrumbsProps) {
    const t = useTranslations('Navigation')
    const locale = useLocale()
    const pathname = usePathname()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
    const currentPageUrl = `${baseUrl}/${locale}${pathname === '/' ? '' : pathname}`

    const jsonLdItems = [
        {
            '@type': 'ListItem',
            position: 1,
            name: t('Home'),
            item: `${baseUrl}/${locale}`
        },
        ...items.map((item, index) => {
            const isLast = index === items.length - 1
            const itemUrl = item.href 
                ? (item.href.startsWith('http') ? item.href : `${baseUrl}/${locale}${item.href.startsWith('/') ? item.href : `/${item.href}`}`)
                : (isLast ? currentPageUrl : `${baseUrl}/${locale}`)
            return {
                '@type': 'ListItem',
                position: index + 2,
                name: item.label,
                item: itemUrl
            }
        })
    ]

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex flex-wrap items-center gap-2 text-xs rtl:text-sm font-medium text-gray-500">
                <li className="flex items-center">
                    <Link href="/" className="hover:text-black transition-colors flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-gray-400" />
                        <span>{t('Home')}</span>
                    </Link>
                </li>
                
                {items.map((item, index) => {
                    const isLast = index === items.length - 1
                    return (
                        <li key={index} className="flex items-center gap-2">
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 rtl:rotate-180" />
                            {item.href && !isLast ? (
                                <Link 
                                    href={item.href as any} 
                                    className="hover:text-black transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-gray-900 font-bold break-words line-clamp-1" aria-current="page">
                                    {item.label}
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>

            {/* JSON-LD for Breadcrumbs Schema.org */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: jsonLdItems
                    })
                }}
            />
        </nav>
    )
}
