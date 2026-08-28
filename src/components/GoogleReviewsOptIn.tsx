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
    }, []);

    if (!isClient) return null;

    return (
        <Script
            id="google-reviews-optin"
            src="https://apis.google.com/js/platform.js"
            strategy="lazyOnload"
            onLoad={() => {
                if (window.gapi) {
                    window.gapi.load('surveyoptin', function() {
                        const config: any = {
                            "merchant_id": 5826844744,
                            "order_id": orderId,
                            "delivery_country": "MA",
                            "estimated_delivery_date": estimatedDeliveryDate,
                            "products": products
                        };
                        
                        if (email) {
                            config.email = email;
                        }

                        window.gapi.surveyoptin.render(config);
                    });
                }
            }}
        />
    )
}
