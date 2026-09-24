'use client'
import React, { useRef, useState } from 'react';
import ImageWithFallback from './ImageWithFallback';

interface TiltImageProps {
    src: string;
    alt: string;
    className?: string;
    priority?: boolean;
}

export default function TiltImage({ src, alt, className, priority = false }: TiltImageProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({});

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -15; // Max 15 deg
        const rotateY = ((x - centerX) / centerX) * 15;

        setStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
            transition: 'transform 0.1s ease-out'
        });
    };

    const handleMouseLeave = () => {
        setStyle({
            transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
            transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
        });
    };

    return (
        <div 
            ref={cardRef} 
            onMouseMove={handleMouseMove} 
            onMouseLeave={handleMouseLeave} 
            style={{...style, transformStyle: 'preserve-3d'}} 
            className="w-full h-full relative overflow-hidden rounded-[2rem] shadow-xl group"
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 mix-blend-overlay"></div>
            <ImageWithFallback src={src} alt={alt} className={className} priority={priority} />
        </div>
    );
}
