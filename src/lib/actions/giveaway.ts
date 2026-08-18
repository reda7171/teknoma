'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getGiveaways() {
    return prisma.giveaway.findMany({
        orderBy: { createdAt: 'desc' }
    })
}

export async function getGiveaway(id: string) {
    return prisma.giveaway.findUnique({
        where: { id }
    })
}

export async function createGiveaway(data: {
    title: string
    platform: string
    postUrl?: string
    prizeDescription?: string
    winnerUsername?: string
    participantsCount: number
    status: string
}) {
    const giveaway = await prisma.giveaway.create({
        data
    })
    revalidatePath('/[locale]/admin/giveaways', 'layout')
    return giveaway
}

export async function deleteGiveaway(id: string) {
    await prisma.giveaway.delete({
        where: { id }
    })
    revalidatePath('/[locale]/admin/giveaways', 'layout')
}
