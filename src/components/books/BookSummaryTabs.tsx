'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Sparkles, Quote, ArrowRight, Clock, User as UserIcon, CheckCircle2 } from 'lucide-react'
import type { BookEditorialInsights } from '@/lib/blog-insights'

interface BookSummaryTabsProps {
    bookId: string;
    summaryParagraphs: string[];
    insights: BookEditorialInsights;
    locale: string;
    labels: {
        synopsisTab: string;
        insightsTab: string;
        busyReadersBadge: string;
        keyIdeasTitle: string;
        keyQuoteTitle: string;
        readFullArticle: string;
        editorialAnalysisSource: string;
        by: string;
    };
}

export default function BookSummaryTabs({
    bookId,
    summaryParagraphs,
    insights,
    locale,
    labels,
}: BookSummaryTabsProps) {
    const [activeTab, setActiveTab] = useState<'synopsis' | 'insights'>('synopsis')
    const hasSourceArticle = Boolean(insights.sourcePost)

    return (
        <div className="space-y-6">
            {/* Tab Switcher Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="inline-flex p-1 bg-gray-100/90 rounded-2xl border border-gray-200/70 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setActiveTab('synopsis')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                            activeTab === 'synopsis'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-600 hover:text-black hover:bg-white/50'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{labels.synopsisTab}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('insights')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 relative ${
                            activeTab === 'insights'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-600 hover:text-black hover:bg-white/50'
                        }`}
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'insights' ? 'text-amber-300' : 'text-emerald-600'}`} />
                        <span>{labels.insightsTab}</span>
                        <span className={`hidden md:inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            activeTab === 'insights' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                            {labels.busyReadersBadge}
                        </span>
                    </button>
                </div>

                <div className="text-[11px] font-medium text-gray-400 flex items-center gap-2">
                    {activeTab === 'insights' && hasSourceArticle && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {labels.editorialAnalysisSource}
                        </span>
                    )}
                </div>
            </div>

            {/* Tab 1: Classic Synopsis */}
            {activeTab === 'synopsis' && (
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-loose bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 italic space-y-4 animate-in fade-in-50 duration-200">
                    {summaryParagraphs.map((paragraph, index) => (
                        <p
                            key={`${bookId}-summary-${index}`}
                            className={index > 0 ? 'text-gray-600 font-medium normal-case tracking-normal mt-4' : undefined}
                        >
                            {paragraph}
                        </p>
                    ))}
                </div>
            )}

            {/* Tab 2: Key Insights & Quotes (Pour les lecteurs pressés) */}
            {activeTab === 'insights' && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                    {/* Source Post Banner (if linked to an editorial article) */}
                    {hasSourceArticle && insights.sourcePost && (
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                    {labels.editorialAnalysisSource}
                                </span>
                                <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                                    « {insights.sourcePost.title} »
                                </h3>
                                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                    {insights.sourcePost.authorName && (
                                        <span className="flex items-center gap-1">
                                            <UserIcon className="w-3 h-3 text-emerald-600" />
                                            {labels.by} {insights.sourcePost.authorName}
                                        </span>
                                    )}
                                    {insights.sourcePost.totalReadTime && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-emerald-600" />
                                            ⏱ {insights.sourcePost.totalReadTime} min
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link
                                href={`/blog/${insights.sourcePost.slug}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 self-start sm:self-auto"
                            >
                                <span>{labels.readFullArticle}</span>
                                <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                            </Link>
                        </div>
                    )}

                    {/* 3 Key Takeaways Cards */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-black">
                                {labels.keyIdeasTitle}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                            {insights.keyIdeas.map((idea, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-emerald-200 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 border border-emerald-100 flex items-center justify-center font-black text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                        0{index + 1}
                                    </div>
                                    <div className="flex-1 text-xs sm:text-sm font-medium text-gray-800 leading-relaxed pt-1">
                                        {idea}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Quote Box */}
                    {insights.quote && (
                        <div className="relative overflow-hidden bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <div className="absolute top-3 right-6 text-7xl font-serif text-gray-100 select-none pointer-events-none">
                                “
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <Quote className="w-4 h-4 text-black" />
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500">
                                    {labels.keyQuoteTitle}
                                </h3>
                            </div>
                            <blockquote className="text-sm sm:text-base font-semibold text-gray-900 italic leading-relaxed pl-3 rtl:pl-0 rtl:pr-3 border-l-2 rtl:border-l-0 rtl:border-r-2 border-black">
                                « {insights.quote} »
                            </blockquote>
                            {insights.quoteAuthor && (
                                <p className="text-xs font-bold text-gray-500 mt-3 text-right">
                                    — {insights.quoteAuthor}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
