'use client'

import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number;
    delay?: number;
    loop?: boolean;
    loopDelay?: number;
    className?: string;
    as?: React.ElementType;
}

export default function TypewriterText({ text, speed = 50, delay = 0, loop = false, loopDelay = 2000, className = '', as: Component = 'span' }: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setStarted(true);
        }, delay);

        return () => clearTimeout(timeout);
    }, [delay]);

    useEffect(() => {
        if (!started) return;

        let i = 0;
        let isDeleting = false;
        let timeoutId: any;
        setDisplayedText(''); // Reset on start
        
        const type = () => {
            if (!isDeleting) {
                i++;
                setDisplayedText(text.slice(0, i));
                if (i >= text.length) {
                    if (loop) {
                        timeoutId = setTimeout(() => {
                            isDeleting = true;
                            type();
                        }, loopDelay);
                    }
                } else {
                    timeoutId = setTimeout(type, speed);
                }
            } else {
                i--;
                setDisplayedText(text.slice(0, i));
                if (i === 0) {
                    isDeleting = false;
                    timeoutId = setTimeout(type, speed);
                } else {
                    timeoutId = setTimeout(type, speed / 2);
                }
            }
        };

        timeoutId = setTimeout(type, speed);

        return () => clearTimeout(timeoutId);
    }, [text, speed, started, loop, loopDelay]);

    return (
        <Component className={className}>
            {displayedText}
        </Component>
    );
}
