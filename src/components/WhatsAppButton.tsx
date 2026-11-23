'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { useLocale } from 'next-intl'
import { notifyWhatsAppClick } from '@/lib/actions/cart-notify'
import { getActiveWhatsAppAgentAction } from '@/lib/actions/whatsapp-presence'

interface WhatsAppButtonProps {
    phone?: string
    agentName?: string
}

function normalizePhone(raw?: string): string {
    let clean = (raw || '').replace(/[^0-9]/g, '')
    if (clean.startsWith('00')) clean = clean.substring(2)
    if (clean.startsWith('0')) clean = '212' + clean.substring(1)
    if (!clean.startsWith('212') && clean.length === 9) clean = '212' + clean
    return clean || '212769686055'
}

export default function WhatsAppButton({ phone, agentName }: WhatsAppButtonProps) {
    const pathname = usePathname()
    const locale = useLocale()
    const [mounted, setMounted] = useState(false)
    const [activePhone, setActivePhone] = useState(phone)
    const [activeAgentName, setActiveAgentName] = useState(agentName)
    const [pageTitle, setPageTitle] = useState('')
    const { items, getTotalItems, getTotalPrice } = useCartStore()
    const totalItems = getTotalItems()
    const totalPrice = Math.round(getTotalPrice())

    // Position state
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [hasMoved, setHasMoved] = useState(false)

    const syncAgent = () => {
        getActiveWhatsAppAgentAction()
            .then(res => {
                if (res?.phone) setActivePhone(res.phone)
                setActiveAgentName(res?.agentName || undefined)
            })
            .catch(() => { })
    }

    // Capture dynamic product or pack title from DOM on route change
    const inspectPageTitle = useCallback(() => {
        if (typeof document === 'undefined') return ''
        const h1 = document.querySelector('main h1') || document.querySelector('h1')
        const text = h1?.textContent?.trim()
        if (text && text.length > 2 && text.length < 120) {
            setPageTitle(text)
            return text
        }
        const docTitle = document.title ? document.title.split('|')[0].replace(/ - Tekno.*/i, '').trim() : ''
        if (docTitle && docTitle.length > 2 && docTitle.length < 120) {
            setPageTitle(docTitle)
            return docTitle
        }
        setPageTitle('')
        return ''
    }, [])

    useEffect(() => {
        setMounted(true)
        syncAgent()
        const interval = setInterval(syncAgent, 10_000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Inspect title on path change with slight delay to ensure client navigation rendered DOM
        const timer = setTimeout(() => {
            inspectPageTitle()
        }, 150)
        return () => clearTimeout(timer)
    }, [pathname, inspectPageTitle])

    const phoneNumber = normalizePhone(activePhone || phone)

    // Build context-aware pre-filled WhatsApp message based on current page
    const generateMessage = (): string => {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://tekno.ma'
        const title = pageTitle || inspectPageTitle()
        const path = pathname || ''

        // 1. Page Produit (/products/[id], /books/[id])
        if (path.includes('/products/') || path.includes('/books/')) {
            const modelLabel = title ? `le modèle "${title}"` : 'ce produit'
            const modelLabelAr = title ? `منتج "${title}"` : 'هذا المنتج'
            const modelLabelEn = title ? `the model "${title}"` : 'this product'

            if (locale === 'ar') {
                return `مرحباً Tekno Store، أود الحصول على معلومات بخصوص ${modelLabelAr} (${currentUrl}). هل هو متوفر في المخزون؟`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I would like information about ${modelLabelEn} (${currentUrl}). Is it available in stock?`
            }
            return `Bonjour Tekno Store, je souhaite des informations sur ${modelLabel} (${currentUrl}). Est-il disponible en stock ?`
        }

        // 2. Page Pack (/packs/[id])
        if (path.includes('/packs/')) {
            const packLabel = title ? `le pack "${title}"` : 'ce pack promotionnel'
            const packLabelAr = title ? `عرض الباقة "${title}"` : 'هذه الباقة الترويجية'
            const packLabelEn = title ? `the pack "${title}"` : 'this promotional pack'

            if (locale === 'ar') {
                return `مرحباً Tekno Store، أنا مهتم بـ ${packLabelAr} (${currentUrl}). هل يمكن تزويدي بمزيد من التفاصيل؟`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I am interested in ${packLabelEn} (${currentUrl}). Could you provide more details?`
            }
            return `Bonjour Tekno Store, je suis intéressé par ${packLabel} (${currentUrl}). Pouvez-vous me donner plus de détails ?`
        }

        // 3. Panier (/cart)
        if (path.includes('/cart')) {
            if (items.length > 0) {
                const list = items.map(item => `• ${item.title} (x${item.quantity})`).join('\n')
                if (locale === 'ar') {
                    return `مرحباً Tekno Store، هذه تفاصيل سلة مشترياتي:\n${list}\nالمجموع: ${totalPrice} درهم.\nما هي مدة وإجراءات التوصيل؟`
                }
                if (locale === 'en') {
                    return `Hello Tekno Store, here is my cart summary:\n${list}\nTotal: ${totalPrice} MAD.\nWhat is the delivery time and process?`
                }
                return `Bonjour Tekno Store, voici le récapitulatif de mon panier :\n${list}\nTotal: ${totalPrice} MAD.\nQuel est le délai de livraison ?`
            }
            if (locale === 'ar') {
                return `مرحباً Tekno Store، لدي سؤال بخصوص طريقة الطلب والتوصيل والدفع عند الاستلام (COD).`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I have a question regarding ordering, shipping, and Cash on Delivery (COD).`
            }
            return `Bonjour Tekno Store, j'ai une question sur vos modalités de commande et le paiement à la livraison (COD).`
        }

        // 4. Checkout / Caisse (/checkout)
        if (path.includes('/checkout')) {
            if (locale === 'ar') {
                return `مرحباً Tekno Store، أحتاج مساعدة لإتمام وتأكيد طلبي والدفع عند الاستلام.`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I need assistance completing my order with Cash on Delivery (COD).`
            }
            return `Bonjour Tekno Store, j'ai besoin d'aide pour finaliser ma commande avec paiement à la livraison (COD).`
        }

        // 5. Suivi de commande (/tracking, /orders, /track)
        if (path.includes('/tracking') || path.includes('/orders') || path.includes('/track')) {
            if (locale === 'ar') {
                return `مرحباً Tekno Store، أود متابعة حالة توصيل طلبي.`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I would like to check the tracking status of my order.`
            }
            return `Bonjour Tekno Store, je souhaite suivre l'état de livraison de ma commande.`
        }

        // 6. Espace Pro & B2B (/b2b)
        if (path.includes('/b2b')) {
            if (locale === 'ar') {
                return `مرحباً Tekno Store، أود الحصول على عرض أسعار للشركات (B2B) للأجهزة والمعدات الذكية.`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I would like a B2B quotation for IT equipment and bulk orders.`
            }
            return `Bonjour Tekno Store, je souhaite obtenir un devis pro / B2B pour du matériel high-tech.`
        }

        // 7. Devenir Vendeur (/devenir-vendeur, /seller)
        if (path.includes('/devenir-vendeur') || path.includes('/seller')) {
            if (locale === 'ar') {
                return `مرحباً Tekno Store، أود الاستفسار عن شروط الانضمام كبائع شريك في منصتكم.`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I would like information about becoming a partner seller on your marketplace.`
            }
            return `Bonjour Tekno Store, je souhaite des renseignements pour devenir vendeur partenaire sur votre marketplace.`
        }

        // 8. Panier non vide depuis une autre page (Accueil, etc.)
        if (items.length > 0) {
            const list = items.map(item => `• ${item.title} (x${item.quantity})`).join('\n')
            if (locale === 'ar') {
                return `مرحباً Tekno Store، أنا مهتم بهذه المنتجات:\n${list}\nالمجموع: ${totalPrice} درهم. هل هي متوفرة للتوصيل؟`
            }
            if (locale === 'en') {
                return `Hello Tekno Store, I am interested in these items:\n${list}\nTotal: ${totalPrice} MAD. Are they available for delivery?`
            }
            return `Bonjour Tekno Store, je suis intéressé par ces produits :\n${list}\nTotal: ${totalPrice} MAD. Sont-ils disponibles pour livraison ?`
        }

        // 9. Message général par défaut (Accueil, Contact, Catalogue général)
        if (locale === 'ar') {
            return `مرحباً Tekno Store، أود الحصول على استشارة لاختيار هاتف ذكي، حاسوب أو إكسسوارات عالية الجودة مع الضمان.`
        }
        if (locale === 'en') {
            return `Hello Tekno Store, I would like advice on choosing a smartphone, laptop, or accessories with official warranty.`
        }
        return `Bonjour Tekno Store, je souhaite des conseils pour choisir un smartphone, un PC portable ou un accessoire avec garantie officielle.`
    }

    const finalMessage = generateMessage()
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(finalMessage)}`

    const dragOriginRef = useRef({ x: 0, y: 0 })

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        setIsDragging(true)
        setHasMoved(false)
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        dragOriginRef.current = { x: clientX, y: clientY }
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y,
        })
    }

    const handleTouchMove = (e: React.TouchEvent | globalThis.MouseEvent) => {
        if (!isDragging) return
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as globalThis.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as globalThis.MouseEvent).clientY

        const dist = Math.hypot(clientX - dragOriginRef.current.x, clientY - dragOriginRef.current.y)
        if (dist > 6) {
            if (e.cancelable) {
                e.preventDefault()
            }
            setHasMoved(true)
            const newX = clientX - dragStart.x
            const newY = clientY - dragStart.y
            setPosition({ x: newX, y: newY })
        }
    }

    const handleTouchEnd = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleTouchMove)
            window.addEventListener('mouseup', handleTouchEnd)
            window.addEventListener('touchmove', handleTouchMove as any, { passive: false })
            window.addEventListener('touchend', handleTouchEnd)
        } else {
            window.removeEventListener('mousemove', handleTouchMove)
            window.removeEventListener('mouseup', handleTouchEnd)
            window.removeEventListener('touchmove', handleTouchMove as any)
            window.removeEventListener('touchend', handleTouchEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleTouchMove)
            window.removeEventListener('mouseup', handleTouchEnd)
            window.removeEventListener('touchmove', handleTouchMove as any)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [isDragging, dragStart])

    const handleClick = (e: React.MouseEvent) => {
        if (hasMoved) {
            e.preventDefault()
            e.stopPropagation()
            return
        }

        notifyWhatsAppClick(finalMessage, activeAgentName).catch(console.error)
    }

    if (!mounted) return null
    if (pathname?.includes('/admin')) return null

    // Libellé de l'info-bulle contextuelle
    let tooltipText = ''
    const isProductPage = Boolean(pathname?.includes('/products/') || pathname?.includes('/books/'))
    const isPackPage = Boolean(pathname?.includes('/packs/'))

    if (isProductPage) {
        if (locale === 'ar') {
            tooltipText = 'استفسار عن هذا الجهاز؟ راسلنا'
        } else if (locale === 'en') {
            tooltipText = 'Questions about this model? Chat now'
        } else {
            tooltipText = 'Une question sur ce modèle ? Écrivez-nous'
        }
    } else if (isPackPage) {
        if (locale === 'ar') {
            tooltipText = 'عرض الباقة : استفسر الآن'
        } else if (locale === 'en') {
            tooltipText = 'Special pack: Chat with us'
        } else {
            tooltipText = 'Offre pack : demandez conseil'
        }
    } else if (totalItems > 0) {
        if (locale === 'ar') {
            tooltipText = `${totalItems} منتج في سلتك`
        } else if (locale === 'en') {
            tooltipText = `${totalItems} item(s) in your cart`
        } else {
            tooltipText = `${totalItems} article(s) dans votre panier`
        }
    } else if (activeAgentName) {
        if (locale === 'ar') {
            tooltipText = `${activeAgentName} متواجد لمساعدتك`
        } else if (locale === 'en') {
            tooltipText = `${activeAgentName} is online · Quick reply`
        } else {
            tooltipText = `${activeAgentName} est en ligne · Réponse rapide`
        }
    } else {
        tooltipText = locale === 'ar' ? 'تواصل معنا على واتساب' : locale === 'en' ? 'Need help? Chat with us' : 'Besoin d’aide ? Contactez-nous'
    }

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            onMouseDown={handleTouchStart}
            onTouchStart={handleTouchStart}
            draggable={false}
            className={`fixed bottom-24 md:bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl group ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-110'}`}
            aria-label="Contact us on WhatsApp"
            style={{
                animation: isDragging ? 'none' : 'whatsapp-bounce 2s ease-in-out infinite',
                transform: `translate(${position.x}px, ${position.y}px)`,
                touchAction: 'none',
            }}
        >
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>

            {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white animate-in zoom-in duration-300 pointer-events-none">
                    {totalItems}
                </span>
            )}

            {/* Bulle d'information contextuelle */}
            <div className="absolute bottom-full right-0 mb-3 flex items-center drop-shadow-md cursor-pointer select-none md:bottom-auto md:right-full md:top-1/2 md:mb-0 md:mr-3.5 md:-translate-y-1/2 rtl:md:right-auto rtl:md:left-full rtl:md:mr-0 rtl:md:ml-3.5 pointer-events-none">
                <div className="relative bg-slate-950 text-white text-[11px] font-bold px-3.5 py-2 rounded-2xl whitespace-nowrap flex items-center gap-2 border border-slate-800 shadow-2xl transition-colors">
                    <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse shrink-0" />
                    <span>{tooltipText}</span>
                    <div className="absolute -bottom-1 right-5 w-2 h-2 bg-slate-950 rotate-45 border-r border-b border-slate-800 md:bottom-auto md:right-[-0.25rem] md:top-1/2 md:-translate-y-1/2 md:border-b-0 md:border-t md:border-r rtl:md:right-auto rtl:md:-left-1 rtl:md:border-t-0 rtl:md:border-r-0 rtl:md:border-b rtl:md:border-l" />
                </div>
            </div>
        </a>
    )
}
