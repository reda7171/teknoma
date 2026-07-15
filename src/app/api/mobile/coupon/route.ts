import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { code, cartTotal } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code requis' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: String(code).toUpperCase(), isActive: true },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Code promo invalide' });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ success: false, error: 'Code promo expiré' });
    }

    if (coupon.minAmount && cartTotal < coupon.minAmount) {
      return NextResponse.json({
        success: false,
        error: `Montant minimum requis : ${coupon.minAmount} MAD`,
      });
    }

    // Calcule la remise
    const discount =
      coupon.type === 'PERCENTAGE'
        ? Math.round((cartTotal * coupon.discount) / 100 * 100) / 100
        : Math.min(coupon.discount, cartTotal);

    return NextResponse.json({
      success: true,
      coupon: { code: coupon.code, discount, type: coupon.type, raw: coupon.discount },
    });
  } catch (error) {
    console.error('Mobile API Error - Coupon:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
