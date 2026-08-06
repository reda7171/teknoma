import { NextResponse } from 'next/server'
import { translateBookFields, translateWithDeepl } from '@/lib/deepl'
import { isAuthenticated } from '@/lib/actions/auth'

// POST /api/admin/translate - Traduire du texte via DeepL
export async function POST(req: Request) {
    // Vérification admin
    const auth = await isAuthenticated()
    if (!auth) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { mode, title, description, texts, targetLang, sourceLang } = body

    // Mode livre : traduit titre + description vers FR et EN
    if (mode === 'book') {
        const result = await translateBookFields({ title, description, sourceLang })
        return NextResponse.json(result)
    }

    // Mode générique : traduit des textes bruts
    if (mode === 'texts' && texts && targetLang) {
        const result = await translateWithDeepl({ texts, targetLang, sourceLang })
        return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
}
