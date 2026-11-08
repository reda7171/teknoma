import { NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { authorizeAdminApi } from '@/lib/api-authorization'
import { privateFilePath } from '@/lib/private-file-path'

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
    const denied = await authorizeAdminApi()
    if (denied) return denied
    const { filename } = await params
    if (!['.pdf', '.docx', '.txt'].includes(extname(filename).toLowerCase())) return new NextResponse(null, { status: 404 })
    for (const root of [join(process.cwd(), 'data', 'private-school-lists'), join(process.cwd(), 'public', 'uploads', 'school-lists')]) {
        const file = privateFilePath(root, filename)
        if (!file) return new NextResponse(null, { status: 404 })
        try {
            const info = await stat(file)
            if (!info.isFile() || info.size > 10 * 1024 * 1024) continue
            return new NextResponse(new Uint8Array(await readFile(file)), {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
                    'Cache-Control': 'private, no-store',
                    'X-Content-Type-Options': 'nosniff',
                    'Content-Security-Policy': "default-src 'none'; sandbox",
                },
            })
        } catch { /* Check the legacy directory without making it public. */ }
    }
    return new NextResponse(null, { status: 404 })
}
