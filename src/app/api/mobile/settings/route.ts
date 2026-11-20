import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Route pour exposer les paramètres de la plateforme au mobile
export async function GET() {
    try {
        const settings = await prisma.siteSettings.findMany({
            where: {
                key: {
                    in: [
                        'payment_cod_enabled',
                        'payment_stripe_enabled',
                        'payment_paypal_enabled',
                        'payment_cmi_enabled',
                        'payment_bank_transfer_enabled',
                        'payment_bank_transfer_accounts',
                        'min_order_amount',
                    ]
                }
            }
        });

        const map: Record<string, string> = {};
        for (const s of settings) {
            map[s.key] = s.value;
        }

        const bankAccounts = (() => {
            try { return JSON.parse(map['payment_bank_transfer_accounts'] || '[]'); }
            catch { return []; }
        })();

        return NextResponse.json({
            paymentMethods: {
                cod: map['payment_cod_enabled'] !== 'false', // actif par défaut
                stripe: map['payment_stripe_enabled'] === 'true',
                paypal: map['payment_paypal_enabled'] === 'true',
                cmi: map['payment_cmi_enabled'] === 'true',
                bankTransfer: map['payment_bank_transfer_enabled'] === 'true',
                bankTransferAccounts: bankAccounts,
            },
            minOrderAmount: Number(map['min_order_amount'] || 0),
        });
    } catch (error) {
        console.error('Mobile settings error:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
