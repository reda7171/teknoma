'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { List } from 'lucide-react'

interface Heading {
    id: string
    text: string
    level: number
}

export default function TableOfContents() {
    const t = useTranslations('BlogArticle')
    const [headings, setHeadings] = useState<Heading[]>([])
    const [activeId, setActiveId] = useState<string>('')

    useEffect(() => {
        // Find all headings inside the article content
        const elements = Array.from(document.querySelectorAll('#article-content h2, #article-content h3'))
        
        const newHeadings = elements.map((elem) => ({
            id: elem.id,
            text: elem.textContent || '',
            level: elem.tagName === 'H2' ? 2 : 3
        })).filter(h => h.id && h.text)

        setHeadings(newHeadings)

        if (newHeadings.length === 0) return;

        // Set up IntersectionObserver to highlight the current section
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveId(entry.target.id)
                    elements.forEach(elem => elem.classList.remove('active-heading'))
                    entry.target.classList.add('active-heading')
                }
            })
        }, {
            rootMargin: '-100px 0px -60% 0px',
            threshold: 0
        })

        elements.forEach(elem => observer.observe(elem))

        return () => observer.disconnect()
    }, [])

    if (headings.length === 0) return null

    return (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 text-slate-900">
            <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-5 flex items-center gap-2">
                <List className="w-3.5 h-3.5" />
                Sommaire
            </p>
            <nav className="flex flex-col gap-3">
                {headings.map(heading => (
                    <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        onClick={(e) => {
                            e.preventDefault();
                            const elem = document.getElementById(heading.id);
                            if (elem) {
                                // Add a little offset for the sticky header
                                const y = elem.getBoundingClientRect().top + window.scrollY - 100;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                                setActiveId(heading.id);
                                document.querySelectorAll('#article-content h2, #article-content h3').forEach(e => e.classList.remove('active-heading'))
                                elem.classList.add('active-heading')
                            }
                        }}
                        className={`transition-all duration-200 line-clamp-2 ${
                            heading.level === 3 ? 'pl-4 rtl:pl-0 rtl:pr-4 text-slate-500 text-sm' : 'font-bold text-slate-700 text-sm'
                        } ${
                            activeId === heading.id ? '!text-red-600 !text-xl !font-black !leading-tight' : 'hover:text-slate-900'
                        }`}
                    >
                        {heading.text}
                    </a>
                ))}
            </nav>
            <style jsx global>{`
                .active-heading {
                    color: #dc2626 !important;
                    font-size: 2.25rem !important;
                    font-weight: 900 !important;
                    line-height: 1.2 !important;
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    )
}
