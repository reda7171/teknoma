/**
 * Service Expo Push Notifications (côté serveur)
 * Utilisé depuis les actions admin pour notifier le client
 */
import { prisma } from '@/lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Envoie une notification Expo Push
export async function sendExpoNotification(payload: PushPayload) {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error('Erreur envoi push notification:', error);
  }
}

// Notifie un client quand le statut de sa commande change
export async function notifyOrderStatus(orderId: string, newStatus: string) {
  const STATUS_MESSAGES: Record<string, string> = {
    CONFIRMED:  'Votre commande a été confirmée ! Nous préparons votre colis.',
    PROCESSING: 'Votre commande est en cours de préparation.',
    SHIPPED:    'Votre commande est en route ! Le livreur est en chemin.',
    DELIVERED:  'Votre commande a été livrée. Bonne lecture !',
    CANCELLED:  'Votre commande a été annulée. Contactez-nous pour plus d\'infos.',
  };

  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return;

  // Récupère le token push de la commande
  const order = await (prisma.order as any).findUnique({
    where: { id: orderId },
    select: { pushToken: true, fullName: true },
  }) as { pushToken?: string; fullName?: string } | null;

  if (!order?.pushToken) return;

  await sendExpoNotification({
    to: order.pushToken,
    title: 'PetsUnivers — Mise à jour de commande',
    body: msg,
    data: { orderId, status: newStatus },
  });
}
