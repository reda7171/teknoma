'use client'

import React from 'react'
import { Link } from '@/i18n/routing'
import { ArrowLeft, ChevronRight, Home } from 'lucide-react'

interface BookSubNavProps {
    bookTitle: string
    homeLabel: string
    booksLabel: string
    backLabel: string
}

export default function BookSubNav({ bookTitle, homeLabel, booksLabel, backLabel }: BookSubNavProps) {
    return (
        <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                {/* Breadcrumb Section */}
                <nav aria-label="Breadcrumb" className="overflow-hidden flex-1">
                    <ol className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs rtl:text-[11px] rtl:sm:text-sm font-medium text-gray-500 whitespace-nowrap">
                        <li className="flex items-center">
                            <Link href="/" className="hover:text-black transition-colors flex items-center gap-1">
                                <Home className="w-3 h-3" />
                                <span className="hidden sm:inline">{homeLabel}</span>
                            </Link>
                        </li>
                        <li className="flex items-center gap-1.5 sm:gap-2">
                            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0 rtl:rotate-180" />
                            <Link 
                                href="/books" 
                                className="hover:text-black transition-colors"
                            >
                                {booksLabel}
                            </Link>
                        </li>
                        <li className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0 rtl:rotate-180" />
                            <span className="text-black font-bold truncate" aria-current="page">
                                {bookTitle}
                            </span>
                        </li>
                    </ol>
                </nav>

                {/* Back Button */}
                <Link
                    href="/books"
                    className="shrink-0 inline-flex items-center gap-2 text-[9px] sm:text-[10px] rtl:text-[10px] sm:rtl:text-[11px] font-black uppercase tracking-widest text-black bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors rtl:flex-row-reverse border border-gray-200"
                >
                    <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
                    <span className="hidden sm:inline">{backLabel}</span>
                    <span className="sm:hidden">{backLabel.split(' ')[0]}</span>
                </Link>
            </div>
        </div>
    )
}
