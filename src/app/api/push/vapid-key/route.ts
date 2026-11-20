import { NextRequest, NextResponse } from 'next/server'

// GET : retourner la clé publique VAPID
export async function GET() {
    return NextResponse.json({
        publicKey: process.env.VAPID_PUBLIC_KEY
    })
}
