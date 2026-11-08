import 'server-only'

import { prisma } from '@/lib/prisma';
import { OrderStatus, OrderItemType, SalesChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getCustomerByPhone(phone: string) {
  try {
    const lastOrder = await prisma.order.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { fullName: true, address: true, city: true }
    });
    return { success: true, customer: lastOrder };
  } catch (error) {
    console.error('getCustomerByPhone Error:', error);
    return { success: false, error: 'Erreur lors de la récupération du client' };
  }
}

export async function createPOSOrder(data: {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  items: {
    id: string;
    type: 'BOOK' | 'PACK' | 'ACCESSORY';
    quantity: number;
    price: number;
    isMissing?: boolean;
  }[];
  total: number;
  subtotal: number;
  discount: number;
  shippingFees: number;
  shippingCompany?: string;
  posSessionId?: string;
}) {
  try {

    // Récupérer les prix de revient (costPrice) pour chaque article
    const itemsWithCost = await Promise.all(data.items.map(async (item) => {
      let costPrice = 0;
      if (item.type === 'BOOK') {
        const book = await prisma.book.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = book?.costPrice || 0;
      } else if (item.type === 'PACK') {
        const pack = await prisma.pack.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = pack?.costPrice || 0;
      } else if (item.type === 'ACCESSORY') {
        const acc = await prisma.extraProduct.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = acc?.costPrice || 0;
      }
      return { ...item, costPrice };
    }));

    const order = await prisma.order.create({
      data: {
        salesChannel: SalesChannel.ADMIN_POS,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        total: data.total,
        subtotal: data.subtotal,
        discount: data.discount,
        shippingFees: data.shippingFees,
        shippingCompany: data.shippingCompany,
        posSessionId: data.posSessionId,
        status: OrderStatus.CONFIRMED,
        paymentMethod: 'CASH',
        items: {
          create: itemsWithCost.map((item) => ({
            type: item.type as OrderItemType,
            quantity: item.quantity,
            price: item.price,
            costPrice: item.costPrice,
            isMissing: Boolean(item.isMissing),
            bookId: item.type === 'BOOK' ? item.id : null,
            packId: item.type === 'PACK' ? item.id : null,
            extraProductId: item.type === 'ACCESSORY' ? item.id : null,
          })),
        },
      },
    });



    // Update stock for books
    const impactedBookIds: string[] = [];
    for (const item of data.items) {
      if (item.type === 'BOOK') {
        impactedBookIds.push(item.id);
        await prisma.book.updateMany({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      } else if (item.type === 'PACK') {
        // Increment books in pack? (Optional depending on business logic)
        const pack = await prisma.pack.findUnique({
          where: { id: item.id },
          include: { books: true },
        });
        if (pack) {
          for (const pb of pack.books) {
            impactedBookIds.push(pb.bookId);
            await prisma.book.updateMany({
              where: { id: pb.bookId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      } else if (item.type === 'ACCESSORY') {
        await prisma.extraProduct.updateMany({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    if (impactedBookIds.length > 0) {
      import("@/lib/server/jumia").then(({ syncJumiaStockForBooksBackground }) => {
        syncJumiaStockForBooksBackground(impactedBookIds).catch(console.error);
      });
    }

    revalidatePath('/admin/orders');

    try {
      const { getOrderById } = await import('@/lib/actions/orders');
      const fullOrder = await getOrderById(order.id);
      if (fullOrder) {
        const { sendOrderNotification } = await import('@/lib/telegram');
        const orderWithSource = { ...fullOrder, source: 'Admin (POS)' };
        sendOrderNotification(orderWithSource as any).catch(console.error);
      }
    } catch (e) {
      console.error('Erreur Telegram Notification POS:', e);
    }

    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error('POS Order Error:', error);
    // Format error stack to return to client for debugging
    const errorMessage = String(error?.message || error);
    return { success: false, error: errorMessage };
  }
}

export interface ParsedWhatsAppOrder {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  shippingFees: number | null;
  total: number | null;
  bookTitle: string | null;
}

function parseWhatsAppLocally(rawText: string): ParsedWhatsAppOrder {
  const clean = rawText
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u00A0\u2000-\u200B\u202F\uFEFF]/g, ' ');

  // 1. Extraction téléphone marocain
  let phone = '';
  const phoneMatch = clean.match(/(?:\+212|00212|0)[\s\-\.]*([5-7])(?:[\s\-\.]*\d){8}/);
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, '');
    if (digits.startsWith('212')) phone = '0' + digits.slice(3);
    else if (digits.startsWith('0')) phone = digits;
  }

  // 2. Frais de livraison & Total
  let shippingFees: number | null = null;
  const feesMatch = clean.match(/(?:tawsil|livraison|frais|chhal\s*tawsil)[^\d\n]*(\d+)\s*(?:dh|dirhams?|درهم)?/i);
  if (feesMatch) {
    shippingFees = parseInt(feesMatch[1], 10);
  }

  let total: number | null = null;
  const totalMatch = clean.match(/(?:total|kheliha|khaliha)[^\d\n]*(\d+)\s*(?:dh|dirhams?|درهم)?/i) ||
                     clean.match(/(\d+)\s*(?:dh|dirhams?|درهم)?\s*(?:total|kheliha|khaliha)/i);
  if (totalMatch) {
    total = parseInt(totalMatch[1], 10);
  }

  // 3. Titre du livre
  let bookTitle: string | null = null;
  const quoteMatch = clean.match(/["'«“]([^"'»”]{3,100})["'»”]/);
  if (quoteMatch) {
    bookTitle = quoteMatch[1].trim();
  }

  // 4. Détection de ville
  const moroccanCitiesMap: Record<string, string> = {
    'oued zem': 'Oued Zem', 'wad zem': 'Oued Zem', 'وادي زم': 'Oued Zem',
    'casablanca': 'Casablanca', 'casa': 'Casablanca', 'الدار البيضاء': 'Casablanca',
    'rabat': 'Rabat', 'الرباط': 'Rabat',
    'marrakech': 'Marrakech', 'kech': 'Marrakech', 'مراكش': 'Marrakech',
    'tanger': 'Tanger', 'tangier': 'Tanger', 'طنجة': 'Tanger',
    'fes': 'Fès', 'fez': 'Fès', 'فاس': 'Fès',
    'meknes': 'Meknès', 'مكناس': 'Meknès',
    'agadir': 'Agadir', 'أكادير': 'Agadir',
    'oujda': 'Oujda', 'وجدة': 'Oujda',
    'kenitra': 'Kénitra', 'القنيطرة': 'Kénitra',
    'tetouan': 'Tétouan', 'تطوان': 'Tétouan',
    'safi': 'Safi', 'آسفي': 'Safi',
    'temara': 'Témara', 'تمارة': 'Témara',
    'salé': 'Salé', 'sale': 'Salé', 'سلا': 'Salé',
    'mohammedia': 'Mohammédia', 'المحمدية': 'Mohammédia',
    'el jadida': 'El Jadida', 'الجديدة': 'El Jadida',
    'beni mellal': 'Béni Mellal', 'بني ملال': 'Béni Mellal',
    'nador': 'Nador', 'الناظور': 'Nador',
    'khouribga': 'Khouribga', 'خريبكة': 'Khouribga',
    'berrechid': 'Berrechid', 'برشيد': 'Berrechid',
    'khemisset': 'Khémisset', 'الخميسات': 'Khémisset',
    'berkane': 'Berkane', 'بركان': 'Berkane',
    'taroudant': 'Taroudant', 'تارودانت': 'Taroudant'
  };

  let detectedCity = '';
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(moroccanCitiesMap)) {
    if (lower.includes(key)) {
      detectedCity = val;
      break;
    }
  }

  // 5. Nettoyage des lignes (horodatages et métadonnées)
  const rawLines = clean
    .split('\n')
    .map(l => l.replace(/^(?:\[.*?\]\s*[^:]+:\s*|.*?-\s*[^:]+:\s*)/, '').trim())
    .filter(Boolean);

  const candidateLines = rawLines.filter(line => {
    const l = line.toLowerCase();
    if (phone && line.replace(/\D/g, '').includes(phone.slice(2))) return false;
    if (line.match(/(?:\+212|00212|0)[5-7]\d{7,8}/)) return false;
    if (l.includes('salam') || l.includes('chhal') || l.includes('tawsil') || l.includes('total') || l.includes('dh')) return false;
    return true;
  });

  let fullName = '';
  let address = '';

  for (const line of candidateLines) {
    const isAddressKeyword = /(?:rue|hay|bd|boulevard|derb|lot|lotissement|residence|immeuble|app|n°|زنقة|شارع|حي|تجزئة|تزئة|إقامة|اقامة|عمارة|درب)/i.test(line);
    const words = line.trim().split(/\s+/);
    if (!fullName && !isAddressKeyword && words.length >= 1 && words.length <= 4 && !/\d{2,}/.test(line)) {
      fullName = line.trim();
    } else if (!address) {
      address = line.trim();
    } else {
      address += ' ' + line.trim();
    }
  }

  return {
    fullName,
    phone,
    city: detectedCity,
    address,
    shippingFees,
    total,
    bookTitle
  };
}

export async function parseWhatsAppOrder(rawText: string): Promise<{ success: boolean; data?: ParsedWhatsAppOrder; error?: string }> {
  if (!rawText || !rawText.trim()) {
    return { success: false, error: 'Texte vide' };
  }

  // 1. Analyse locale instantanée (< 5ms)
  const localResult = parseWhatsAppLocally(rawText);
  if (localResult.fullName && localResult.phone && (localResult.city || localResult.address)) {
    return { success: true, data: localResult };
  }

  // 2. IA Ultra-rapide Gemini Flash Lite avec timeout strict de 2.5 secondes
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const { getSetting } = await import('@/lib/server/site-settings');

    const apiKey = (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

      const prompt = `Extrais les infos de commande WhatsApp en JSON strict uniquement:
{"fullName": string, "phone": string, "city": string, "address": string, "shippingFees": number|null, "total": number|null, "bookTitle": string|null}
Texte:
${rawText}`;

      const aiPromise = (async () => {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json|```/gi, '').trim();
        return JSON.parse(text);
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
      const parsedJson: any = await Promise.race([aiPromise, timeoutPromise]);

      if (parsedJson && (parsedJson.fullName || parsedJson.phone || parsedJson.city || parsedJson.address)) {
        return {
          success: true,
          data: {
            fullName: String(parsedJson.fullName || localResult.fullName || '').trim(),
            phone: String(parsedJson.phone || localResult.phone || '').replace(/\D/g, '').trim(),
            city: String(parsedJson.city || localResult.city || '').trim(),
            address: String(parsedJson.address || localResult.address || '').trim(),
            shippingFees: typeof parsedJson.shippingFees === 'number' ? parsedJson.shippingFees : localResult.shippingFees,
            total: typeof parsedJson.total === 'number' ? parsedJson.total : localResult.total,
            bookTitle: parsedJson.bookTitle ? String(parsedJson.bookTitle).trim() : localResult.bookTitle,
          }
        };
      }
    }
  } catch (aiError) {
    console.warn('Gemini Flash Lite fallback activated:', aiError);
  }

  // Si l'IA dépasse 2.5s ou échoue, renvoyer immédiatement le résultat local
  return { success: true, data: localResult };
}
