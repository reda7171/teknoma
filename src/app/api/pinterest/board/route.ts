import { NextResponse } from 'next/server'
import { getSetting, updateSetting } from '@/lib/actions/site-settings'
import { verifyAdmin } from '@/lib/actions/auth'

export async function POST(request: Request) {
    try {
        await verifyAdmin()

        const { name, description } = await request.json()

        if (!name) {
            return NextResponse.json({ success: false, error: "Le nom du tableau est requis" }, { status: 400 })
        }

        const accessToken = await getSetting('pinterest_access_token')

        if (!accessToken) {
            return NextResponse.json({ success: false, error: "Token Pinterest introuvable" }, { status: 401 })
        }

        const res = await fetch('https://api.pinterest.com/v5/boards', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                description: description || 'Créé via Riwaya',
                privacy: 'PUBLIC'
            })
        })

        const data = await res.json()

        if (!res.ok) {
            return NextResponse.json({ success: false, error: data.message || "Erreur lors de la création" }, { status: res.status })
        }

        // Mettre à jour les paramètres avec le nouvel ID
        await updateSetting('pinterest_board_id', data.id, 'config', 'Pinterest Board ID')

        return NextResponse.json({ success: true, board: data })

    } catch (error: any) {
        console.error("Erreur Create Board Pinterest:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
