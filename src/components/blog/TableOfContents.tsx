'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { List, ChevronDown } from 'lucide-react'

interface Heading {
    id: string
    text: string
    level: number
}

export default function TableOfContents({ language = 'fr' }: { language?: string }) {
    const t = useTranslations('BlogArticle')
    const [headings, setHeadings] = useState<Heading[]>([])
    const [activeId, setActiveId] = useState<string>('')
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Find all headings inside the article content
        const elements = Array.from(document.querySelectorAll('#article-content h2, #article-content h3'))
        
        const newHeadings = elements.map((elem) => ({
            id: elem.id,
            text: elem.textContent || '',
            level: elem.tagName === 'H2' ? 2 : 3
        })).filter(h => h.id && h.text)

        // Ajouter "À propos de l'auteur" au sommaire si présent et visible
        const authorBioElem = document.getElementById('author-bio-mobile');
        if (authorBioElem && window.getComputedStyle(authorBioElem).display !== 'none') {
            newHeadings.push({
                id: 'author-bio-mobile',
                text: t('AboutAuthor'),
                level: 2
            });
        }

        setHeadings(newHeadings)

        if (newHeadings.length === 0) return;

        const handleScroll = () => {
            if (elements.length === 0) return;
            
            let currentActiveId = elements[0].id; // Default to first heading
            
            // Find the last heading that is at or above the top of the viewport
            for (const elem of elements) {
                const rect = elem.getBoundingClientRect();
                if (rect.top <= 250) {
                    currentActiveId = elem.id;
                }
            }

            setActiveId((prevId) => {
                if (prevId !== currentActiveId) {
                    elements.forEach(elem => elem.classList.remove('active-heading'));
                    const activeElem = document.getElementById(currentActiveId);
                    if (activeElem) activeElem.classList.add('active-heading');
                    return currentActiveId;
                }
                return prevId;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        
        handleScroll(); // Check immediately
        
        // Check again after a delay to account for images loading and layout shifting
        const t1 = setTimeout(handleScroll, 500);
        const t2 = setTimeout(handleScroll, 1500);
        const t3 = setTimeout(handleScroll, 3000);

        // --- Heading Reveal Animations ---
        elements.forEach(elem => {
            elem.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-700', 'ease-out');
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('opacity-0', 'translate-y-4');
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px 0px -10% 0px',
            threshold: 0
        });

        elements.forEach(elem => revealObserver.observe(elem));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            revealObserver.disconnect();
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        }
    }, [])

    if (headings.length === 0) return null

    return (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl p-5 md:p-6 mb-8 text-slate-900 shadow-sm md:shadow-none">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-[11px] rtl:text-[13px] font-black uppercase tracking-[0.2em] rtl:tracking-normal text-slate-500 md:cursor-default md:pointer-events-none"
            >
                <div className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    {t('TableOfContents')}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform md:hidden ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <nav dir={language === 'ar' ? 'rtl' : 'ltr'} className={`flex-col gap-3 mt-5 md:flex ${isOpen ? 'flex' : 'hidden'}`}>
                {headings.map(heading => (
                    <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        onClick={(e) => {
                            e.preventDefault();
                            const elem = document.getElementById(heading.id);
                            if (elem) {
                                const y = elem.getBoundingClientRect().top + window.scrollY - 100;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                                setActiveId(heading.id);
                                document.querySelectorAll('#article-content h2, #article-content h3').forEach(e => e.classList.remove('active-heading'))
                                elem.classList.add('active-heading')
                                setIsOpen(false); // Close mobile menu on click
                            }
                        }}
                        className={`transition-all duration-300 block line-clamp-2 ${
                            heading.level === 3 ? 'pl-4 rtl:pl-0 rtl:pr-4 text-slate-500 text-sm' : 'font-bold text-slate-700 text-sm'
                        } ${
                            activeId === heading.id ? '!text-red-600 translate-x-2 rtl:-translate-x-2 !font-black' : 'hover:text-slate-900'
                        }`}
                    >
                        {heading.text}
                    </a>
                ))}
            </nav>
            <style jsx global>{`
                .active-heading {
                    color: #dc2626 !important;
                    transition: color 0.3s ease !important;
                }
            `}</style>
        </div>
    )
}
