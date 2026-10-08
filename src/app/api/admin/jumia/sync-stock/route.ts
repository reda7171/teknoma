import { NextResponse } from 'next/server'
import { syncBooksStockToJumia } from '@/lib/actions/jumia'

export async function POST() {
    try {
        const result = await syncBooksStockToJumia()
        return NextResponse.json(result)
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 })
    }
}
