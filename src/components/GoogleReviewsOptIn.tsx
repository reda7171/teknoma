'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { updateOrderEmail } from '@/lib/actions/orders'
import { X, Mail, CheckCircle, Loader2 } from 'lucide-react'

interface OptInProps {
    orderId: string;
    email?: string | null;
    estimatedDeliveryDate: string;
    products: Array<{ gtin: string }>;
}

export default function GoogleReviewsOptIn({ orderId, email, estimatedDeliveryDate, products }: OptInProps) {
    const [isClient, setIsClient] = useState(false);
    const [providedEmail, setProvidedEmail] = useState<string | null>(email || null);
    const [showModal, setShowModal] = useState(false);
    const [inputEmail, setInputEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [declined, setDeclined] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!email && !providedEmail && !declined) {
            setShowModal(true);
        }
    }, [email, providedEmail, declined]);

    useEffect(() => {
        if (!providedEmail) return;

        (window as any).renderOptIn = function() {
            if ((window as any).gapi) {
                (window as any).gapi.load('surveyoptin', function() {
                    const config: any = {
                        "merchant_id": 5826844744,
                        "order_id": orderId,
                        "delivery_country": "MA",
                        "estimated_delivery_date": estimatedDeliveryDate,
                        "opt_in_style": "CENTER_DIALOG",
                        "email": providedEmail
                    };
                    (window as any).gapi.surveyoptin.render(config);
                });
            }
        };

        // If gapi is already loaded and surveyoptin is available, run it immediately
        if ((window as any).gapi && (window as any).gapi.surveyoptin) {
            (window as any).renderOptIn();
        }
    }, [orderId, providedEmail, estimatedDeliveryDate, products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputEmail || !inputEmail.includes('@')) return;

        setIsSubmitting(true);
        try {
            const res = await updateOrderEmail(orderId, inputEmail);
            if (res.success) {
                setProvidedEmail(inputEmail);
                setShowModal(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDecline = () => {
        setDeclined(true);
        setShowModal(false);
    };

    if (!isClient) return null;

    return (
        <>
            {providedEmail && !declined && (
                <Script
                    id="google-reviews-optin"
                    src="https://apis.google.com/js/platform.js?onload=renderOptIn"
                    strategy="afterInteractive"
                />
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Décoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <button 
                            onClick={handleDecline}
                            className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div className="relative z-10 flex flex-col items-center text-center mt-4">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-8 h-8 text-indigo-500" />
                            </div>
                            
                            <h3 className="text-2xl font-black text-black mb-2 tracking-tight">Votre avis compte !</h3>
                            <p className="text-gray-500 text-sm mb-8 font-medium">
                                Voulez-vous évaluer votre expérience d'achat sur Riwaya ? Entrez votre email pour recevoir notre questionnaire Google Avis.
                            </p>
                            
                            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="email" 
                                        required
                                        value={inputEmail}
                                        onChange={(e) => setInputEmail(e.target.value)}
                                        placeholder="Votre adresse email"
                                        className="w-full bg-gray-50 text-black px-12 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        dir="ltr"
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !inputEmail}
                                    className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Oui, je participe"}
                                </button>
                                
                                <button 
                                    type="button" 
                                    onClick={handleDecline}
                                    className="text-gray-400 hover:text-black text-xs font-bold tracking-widest uppercase mt-2 transition-colors"
                                >
                                    Non merci
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
