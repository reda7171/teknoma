import { NextResponse } from 'next/server'
import { translateBookFields, translateWithDeepl } from '@/lib/deepl'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

// POST /api/admin/translate - Traduire du texte via DeepL
export async function POST(req: Request) {
    // Vérification admin
    const admin = await getAuthenticatedAdmin()
    if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    if (!hasAdminRole(admin, ['ADMIN', 'MANAGER'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

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
