import webpush from 'web-push'

// Configuration VAPID (only if keys are present to avoid build errors)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:contact@tekno.ma',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    )
} else {
    console.warn('VAPID keys not found. Web push notifications will not work.');
}

export interface PushPayload {
    title: string
    body: string
    url?: string
    icon?: string
    badge?: string
}

// Envoyer une notification à un abonné
export async function sendPushNotification(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
): Promise<{ success: boolean; expired?: boolean }> {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            },
            JSON.stringify(payload)
        )
        return { success: true }
    } catch (err: any) {
        // 410 = abonné désinscrit, 404 = endpoint invalide
        if (err.statusCode === 410 || err.statusCode === 404) {
            return { success: false, expired: true }
        }
        return { success: false }
    }
}

export { webpush }
