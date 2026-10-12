'use client'
import React, { useRef } from 'react';
import ImageWithFallback from './ImageWithFallback';

interface TiltImageProps {
    src: string;
    alt: string;
    className?: string;
    priority?: boolean;
    sizes?: string;
}

export default function TiltImage({
    src,
    alt,
    className,
    priority = false,
    sizes = '(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 384px',
}: TiltImageProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        // Évite tout blocage du thread principal (INP) sur tactile/mobile
        if (!cardRef.current || (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;

        if (rafId.current) cancelAnimationFrame(rafId.current);

        rafId.current = requestAnimationFrame(() => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -12;
            const rotateY = ((x - centerX) / centerX) * 12;

            cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
            cardRef.current.style.transition = 'transform 0.1s ease-out';
        });
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        if (rafId.current) cancelAnimationFrame(rafId.current);
        cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        cardRef.current.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
    };

    return (
        <div 
            ref={cardRef} 
            onMouseMove={handleMouseMove} 
            onMouseLeave={handleMouseLeave} 
            style={{ transformStyle: 'preserve-3d' }} 
            className="w-full h-full relative overflow-hidden rounded-[2rem] shadow-xl group bg-slate-100"
        >
            {/* Shimmer skeleton sous la couverture pour 0 CLS et rendu instantané */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/50 to-slate-100 animate-pulse pointer-events-none rounded-[2rem]" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 mix-blend-overlay"></div>
            <ImageWithFallback
                src={src}
                alt={alt}
                className={className}
                priority={priority}
                sizes={sizes}
            />
        </div>
    );
}
