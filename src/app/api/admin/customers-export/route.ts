import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const secret = url.searchParams.get('secret');

        // Sécurité : Utiliser uniquement la variable d'environnement (pas de clé en dur)
        if (!process.env.API_SECRET || secret !== process.env.API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: {
                status: {
                    in: [OrderStatus.DELIVERED, OrderStatus.CONFIRMED]
                }
            },
            select: {
                phone: true,
                fullName: true,
                city: true,
                items: {
                    select: {
                        quantity: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const customerMap = new Map();

        orders.forEach(order => {
            let phone = order.phone.replace(/\D/g, '');
            // Basic formatting to standard international 
            if (phone.startsWith('0')) {
                phone = '212' + phone.substring(1);
            } else if (!phone.startsWith('212') && phone.length === 9) {
                phone = '212' + phone;
            }

            if (!customerMap.has(phone)) {
                // Extract first name for the message
                const firstName = order.fullName.split(' ')[0] || order.fullName;
                
                customerMap.set(phone, {
                    phone: phone,
                    name: order.fullName,
                    first_name: firstName,
                    city: order.city,
                    nbr_article: 0,
                    nbr_cmd: 0,
                    suggested_message: ''
                });
            }

            const customer = customerMap.get(phone);
            customer.nbr_cmd += 1;
            
            const orderItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            customer.nbr_article += orderItemsCount;
        });

        // Generate personalized messages
        const result = Array.from(customerMap.values()).map(customer => {
            let message = '';
            
            if (customer.nbr_cmd > 1) {
                message = `Salam ${customer.first_name} cv, rak mn lklyan lwfyin dyalna (dwzti ${customer.nbr_cmd} commandes). Lidalika bghina ngolo lik ila 3awdti commanditi 3ndna ghadi nkhaliw lik ktab fabour, wakha yt7ssb lik f la caisse 7na ghadi no9ssoh.`;
            } else {
                message = `Salam ${customer.first_name} cv, knti khditi 3ndna ${customer.nbr_article} books mn riwaya.store. Lidalika bghina ngolo lik ila 3awdti commanditi 3ndna ghadi nkhaliw lik ktab fabour, wakha yt7ssb lik f la caisse 7na ghadi no9ssoh.`;
            }

            return {
                phone: customer.phone,
                name: customer.name,
                city: customer.city,
                nbr_article: customer.nbr_article,
                nbr_cmd: customer.nbr_cmd,
                suggested_message: message
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching customers export:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
