import 'server-only'
import { prisma } from '@/lib/prisma'
import type { NotificationType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/lib/expo-push'
interface CreateNotificationParams {
    userId: string
    type: NotificationType | 'EXCHANGE_REQUEST' | 'EXCHANGE_ACCEPTED' | 'EXCHANGE_REJECTED' | 'NEW_MESSAGE' | 'EXCHANGE_COMPLETED' | 'RATING_RECEIVED' | 'SYSTEM'
    title: string
    message: string
    link?: string
}
export async function createNotification(params: CreateNotificationParams) {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type as NotificationType,
                title: params.title,
                message: params.message,
                link: params.link
            }
        })

        // Send Push Notification if user has an expoPushToken
        const userWithToken = await prisma.customer.findUnique({
            where: { id: params.userId },
            select: { expoPushToken: true }
        })

        if (userWithToken?.expoPushToken) {
            await sendPushNotification(
                userWithToken.expoPushToken,
                params.title,
                params.message,
                { url: params.link }
            )
        }

        revalidatePath('/community')
        return { success: true, notification }
    } catch (error) {
        return { success: false, error: "Erreur lors de la création de la notification" }
    }
}
