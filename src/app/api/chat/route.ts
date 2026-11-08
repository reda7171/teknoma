import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody } from '@/lib/request-body'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { chatWithDatabase } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown'
        const limiter = await rateLimit(`chat_${ip}`, { limit: 20, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ reply: "..." }, { status: 429 })

        const { message, locale } = z.object({ message: z.string().min(1).max(2000), locale: z.enum(['fr','ar','en']).default('fr') }).parse(await readJsonBody(req, 8192))
        if (!message) return NextResponse.json({ reply: "..." }, { status: 400 })

        // Utilisation de l'IA Gemini avec accès à la DB
        const result = await chatWithDatabase(message, locale)



        return NextResponse.json({
            reply: result.text,
            type: result.type,
            data: result.data
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ reply: "Désolé, je suis un peu fatigué. Réessayez plus tard ! 😴" }, { status: 500 })
    }
}
