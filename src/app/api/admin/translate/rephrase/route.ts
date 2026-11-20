import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { rephraseWithDeepl } from '@/lib/deepl'

export async function POST(req: Request) {
    try {
        await verifyAdmin()

        const body = await req.json()
        const { text, targetLang, style, tone } = body

        if (!text || !targetLang) {
            return NextResponse.json({ error: 'Text and targetLang are required' }, { status: 400 })
        }

        const result = await rephraseWithDeepl({
            text: Array.isArray(text) ? text : [text],
            targetLang,
            style,
            tone
        })

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            rephrased: result.translations
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
