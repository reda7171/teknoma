import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()
        const { query } = await req.json()
        
        if (!query || typeof query !== 'string') {
            return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
        }

        // Security check: restrict to safe SQL statements, or allow all since it's an admin terminal.
        // We will allow SELECT, SHOW, DESCRIBE, UPDATE, DELETE, INSERT
        const upperQuery = query.trim().toUpperCase()
        const allowedPrefixes = ['SELECT', 'SHOW', 'DESCRIBE', 'UPDATE', 'DELETE', 'INSERT', 'ALTER', 'CREATE', 'DROP']
        
        if (!allowedPrefixes.some(prefix => upperQuery.startsWith(prefix))) {
            return NextResponse.json({ 
                success: false, 
                error: 'Type de requête non reconnu ou non autorisé.' 
            }, { status: 403 })
        }

        const result = await prisma.$queryRawUnsafe<any[]>(query)
        
        // Ensure BigInts are converted to string to avoid JSON serialization errors
        const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))

        return NextResponse.json({ success: true, data: serializedResult })
    } catch (err: any) {
        console.error('SQL TERMINAL ERROR:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
