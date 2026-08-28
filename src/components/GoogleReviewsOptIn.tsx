'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

interface OptInProps {
    orderId: string;
    email?: string | null;
    estimatedDeliveryDate: string;
    products: Array<{ gtin: string }>;
}

export default function GoogleReviewsOptIn({ orderId, email, estimatedDeliveryDate, products }: OptInProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        
        (window as any).renderOptIn = function() {
            if ((window as any).gapi) {
                (window as any).gapi.load('surveyoptin', function() {
                    const config: any = {
                        "merchant_id": 5826844744,
                        "order_id": orderId,
                        "delivery_country": "MA",
                        "estimated_delivery_date": estimatedDeliveryDate,
                        "opt_in_style": "CENTER_DIALOG"
                    };
                    
                    if (email) {
                        config.email = email;
                    } else {
                        config.email = "reda7171@gmail.com";
                    }

                    (window as any).gapi.surveyoptin.render(config);
                });
            }
        };

        // If gapi is already loaded and surveyoptin is available, run it immediately
        if ((window as any).gapi && (window as any).gapi.surveyoptin) {
            (window as any).renderOptIn();
        }
    }, [orderId, email, estimatedDeliveryDate, products]);

    if (!isClient) return null;

    return (
        <Script
            id="google-reviews-optin"
            src="https://apis.google.com/js/platform.js?onload=renderOptIn"
            strategy="afterInteractive"
        />
    )
}
