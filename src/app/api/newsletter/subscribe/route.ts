import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
        }

        // Vérifier si l'email existe déjà
        const existing = await prisma.newsletterSubscriber.findUnique({
            where: { email }
        })

        if (existing) {
            return NextResponse.json({ success: true, message: 'Déjà inscrit' })
        }

        await prisma.newsletterSubscriber.create({
            data: { email }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Newsletter Error:', error)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
