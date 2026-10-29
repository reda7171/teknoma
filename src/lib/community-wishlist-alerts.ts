import { prisma } from '@/lib/prisma'
import { transporter } from '@/lib/email'
import { formatMoroccanPhone } from '@/lib/whatsapp'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendPushNotification } from '@/lib/expo-push'
import { getPrimaryImage } from '@/lib/utils/image'

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function areTitlesMatching(title1: string, title2: string): boolean {
    const t1 = normalizeText(title1)
    const t2 = normalizeText(title2)
    if (!t1 || !t2) return false
    if (t1 === t2) return true
    if (t1.includes(t2) || t2.includes(t1)) return true

    // Compare significant words (3+ characters)
    const words1 = t1.split(' ').filter(w => w.length >= 3)
    const words2 = t2.split(' ').filter(w => w.length >= 3)
    if (words1.length > 0 && words2.length > 0) {
        const commonWords = words1.filter(w => words2.includes(w))
        if (commonWords.length >= Math.min(words1.length, words2.length)) return true
    }
    return false
}

function areCitiesMatching(city1?: string | null, city2?: string | null): boolean {
    if (!city1 || !city2) return false
    const c1 = normalizeText(city1)
    const c2 = normalizeText(city2)
    if (!c1 || !c2) return false
    return c1 === c2 || c1.includes(c2) || c2.includes(c1)
}

/**
 * Alerte automatiquement par Email et WhatsApp les utilisateurs ayant ce livre dans leur wishlist
 * et résidant dans la même ville que le propriétaire.
 */
export async function notifyWishlistUsersOnNewBook(bookId: string) {
    try {
        const book = await prisma.exchangeBook.findUnique({
            where: { id: bookId },
            include: {
                owner: true
            }
        })

        if (!book) return { count: 0 }

        // Déterminer la ville du propriétaire du livre
        let ownerCity = book.owner?.city
        if (!ownerCity) {
            const ownerUser = await prisma.user.findUnique({
                where: { id: book.ownerId },
                select: { city: true }
            })
            ownerCity = ownerUser?.city || null
        }

        if (!ownerCity) {
            console.log(`[WishlistAlerts] Livre #${bookId} sans ville renseignée pour le propriétaire.`)
            return { count: 0 }
        }

        // Récupérer toutes les entrées de wishlist (excluant le propriétaire)
        const wishlists = await prisma.wishlist.findMany({
            where: {
                userId: { not: book.ownerId }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        city: true,
                        locale: true,
                        expoPushToken: true
                    }
                }
            }
        })

        if (!wishlists || wishlists.length === 0) return { count: 0 }

        // Filtrer les utilisateurs dont la ville et le titre correspondent
        const matchedUsersMap = new Map<string, { user: any; matchedTitle: string }>()

        for (const item of wishlists) {
            if (!item.user) continue

            // Vérifier la correspondance du titre
            const titleMatches = areTitlesMatching(item.title, book.title)
            if (!titleMatches) continue

            // Résoudre la ville de l'utilisateur
            let userCity = item.user.city
            if (!userCity && item.user.email) {
                // Fallback sur la dernière commande
                const lastOrder = await prisma.order.findFirst({
                    where: {
                        OR: [
                            { email: item.user.email },
                            ...(item.user.phone ? [{ phone: item.user.phone }] : [])
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { city: true }
                })
                userCity = lastOrder?.city || null
            }

            if (userCity && areCitiesMatching(userCity, ownerCity)) {
                if (!matchedUsersMap.has(item.user.id)) {
                    matchedUsersMap.set(item.user.id, {
                        user: { ...item.user, city: userCity },
                        matchedTitle: item.title
                    })
                }
            }
        }

        const matches = Array.from(matchedUsersMap.values())
        if (matches.length === 0) return { count: 0 }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'
        const imageUrl = book.image ? getPrimaryImage(book.image) : null
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`) : null

        // Envoi des alertes pour chaque utilisateur correspondant
        for (const { user, matchedTitle } of matches) {
            const userLocale = user.locale || 'fr'
            const bookUrl = `${baseUrl}/${userLocale}/community/market/${book.id}`

            // 1. Notification In-App
            try {
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: userLocale === 'ar'
                            ? '📚 كتاب من قائمة رغباتك متوفر في مدينتك!'
                            : `📚 "${book.title}" disponible à ${ownerCity} !`,
                        message: userLocale === 'ar'
                            ? `تمت إضافة كتاب "${book.title}" من طرف قارئ بمدينتك (${ownerCity}). اضغط للتواصل وبدء التبادل.`
                            : `Le livre "${book.title}" de votre liste d'envies vient d'être mis en échange par un lecteur à ${ownerCity}. Cliquez pour demander l'échange.`,
                        type: 'EXCHANGE',
                        link: `/community/market/${book.id}`
                    }
                })
            } catch (err) {
                console.error('[WishlistAlerts] Erreur notification in-app:', err)
            }

            // 2. Notification Push Mobile (si configuré)
            if (user.expoPushToken) {
                try {
                    await sendPushNotification(
                        user.expoPushToken,
                        `📚 Livre trouvé à ${ownerCity} !`,
                        `"${book.title}" (${book.author}) est disponible pour échange près de chez vous.`,
                        { url: bookUrl }
                    )
                } catch (err) {
                    console.error('[WishlistAlerts] Erreur push mobile:', err)
                }
            }

            // 3. Notification Email
            if (user.email && user.email.includes('@')) {
                try {
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html lang="${userLocale}">
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf9f6; margin: 0; padding: 20px; color: #111; }
                            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #eeeeee; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
                            .header { background: #111111; color: #ffffff; padding: 24px; text-align: center; }
                            .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 900; }
                            .content { padding: 32px 28px; }
                            .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
                            .book-box { display: flex; gap: 20px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 18px; margin: 20px 0; align-items: center; }
                            .book-img { width: 90px; height: 130px; object-fit: cover; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background: #eee; flex-shrink: 0; }
                            .book-info h3 { margin: 0 0 6px 0; font-size: 17px; color: #000; font-weight: 800; }
                            .book-info p { margin: 4px 0; font-size: 13px; color: #666; }
                            .cta-btn { display: block; text-align: center; background: #000000; color: #ffffff !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 16px 24px; border-radius: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 24px; }
                            .footer { text-align: center; font-size: 11px; color: #999; padding: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="header">
                                <h1>PetsUnivers COMMUNITY</h1>
                            </div>
                            <div class="content">
                                <span class="badge">Alerte Wishlist &bull; ${ownerCity}</span>
                                <h2 style="font-size: 22px; font-weight: 900; margin-top: 0;">Bonne nouvelle ${user.fullName ? user.fullName : ''} !</h2>
                                <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                                    Un livre correspondant à votre liste d'envies (<strong>"${matchedTitle}"</strong>) vient d'être publié par un lecteur dans votre ville à <strong>${ownerCity}</strong>.
                                </p>

                                <div class="book-box">
                                    ${fullImageUrl ? `<img src="${fullImageUrl}" alt="${book.title}" class="book-img" />` : ''}
                                    <div class="book-info">
                                        <h3>${book.title}</h3>
                                        <p><strong>Auteur :</strong> ${book.author}</p>
                                        <p><strong>État :</strong> ${book.condition}</p>
                                        <p><strong>Lieu :</strong> ${ownerCity}</p>
                                    </div>
                                </div>

                                <p style="font-size: 13px; color: #6b7280;">
                                    Vous pouvez dès maintenant proposer un échange direct ou via crédits sans aucun frais intermédiaire.
                                </p>

                                <a href="${bookUrl}" class="cta-btn">
                                    Voir l'annonce &amp; Demander l'échange
                                </a>
                            </div>
                            <div class="footer">
                                &copy; PetsUnivers &bull; Plateforme d'échange de livres au Maroc<br>
                                <a href="${baseUrl}" style="color: #666;">www.petsunivers.ma</a>
                            </div>
                        </div>
                    </body>
                    </html>
                    `

                    await transporter.sendMail({
                        from: '"PetsUnivers Community" <contact@petsunivers.ma>',
                        to: user.email,
                        subject: `📚 Livre trouvé à ${ownerCity} : "${book.title}" est disponible pour échange !`,
                        html: emailHtml
                    })
                } catch (err) {
                    console.error('[WishlistAlerts] Erreur envoi email:', err)
                }
            }

            // 4. Notification WhatsApp
            if (user.phone) {
                try {
                    const cleanPhone = formatMoroccanPhone(user.phone)
                    const waMessage = `Salam ${user.fullName || 'cher lecteur'} ! 📚\n\nBonne nouvelle : le livre *"${book.title}"* (${book.author}) que vous cherchez dans votre wishlist vient d'être mis en échange dans votre ville (*${ownerCity}*) !\n\n👉 Voir l'annonce et proposer un échange sans frais :\n${bookUrl}\n\nPetsUnivers Community`
                    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`

                    // Récupérer le webhook WhatsApp si configuré
                    const webhookSetting = await prisma.siteSettings.findUnique({
                        where: { key: 'whatsapp_webhook_url' }
                    }).catch(() => null)

                    const webhookUrl = webhookSetting?.value || process.env.WHATSAPP_WEBHOOK_URL
                    let sentViaGateway = false

                    if (webhookUrl) {
                        try {
                            const res = await fetch(webhookUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    phone: cleanPhone,
                                    fullName: user.fullName || 'Lecteur',
                                    message: waMessage,
                                    type: 'WISHLIST_ALERT',
                                    bookId: book.id,
                                    city: ownerCity,
                                    timestamp: new Date().toISOString()
                                })
                            })
                            sentViaGateway = res.ok
                        } catch (err) {
                            console.error('[WishlistAlerts] Erreur webhook WhatsApp:', err)
                        }
                    }

                    // Enregistrer dans les logs WhatsApp
                    await prisma.whatsAppMessageLog.create({
                        data: {
                            phone: cleanPhone,
                            message: waMessage,
                            status: sentViaGateway ? 'SENT' : 'PENDING_LINK',
                            type: 'WISHLIST_ALERT',
                            metadata: JSON.stringify({ bookId: book.id, ownerCity, userId: user.id })
                        }
                    }).catch(() => null)

                    // Alerte Telegram pour l'admin avec lien 1-clic si le gateway n'a pas répondu
                    if (!sentViaGateway) {
                        const telegramText = `🔔 *Alerte Wishlist Ville Déclenchée*\n\n📚 *Livre:* ${book.title}\n📍 *Ville:* ${ownerCity}\n👤 *Destinataire:* ${user.fullName || 'Lecteur'}\n📞 \`+${cleanPhone}\`\n\n💬 *Envoyer sur WhatsApp :*`
                        await sendTelegramMessage(telegramText, undefined, undefined, {
                            inline_keyboard: [[{ text: '💬 Envoyer WhatsApp au lecteur', url: waLink }]]
                        }).catch(() => null)
                    }
                } catch (err) {
                    console.error('[WishlistAlerts] Erreur WhatsApp:', err)
                }
            }
        }

        console.log(`[WishlistAlerts] ${matches.length} alerte(s) envoyée(s) pour le livre "${book.title}" à ${ownerCity}.`)
        return { count: matches.length }

    } catch (error) {
        console.error('[WishlistAlerts] Erreur globale notification wishlist:', error)
        return { count: 0 }
    }
}
