import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { importBooksFromExcel, updateStockFromTsv, type ProgressCallback } from '@/lib/actions/bulk-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes pour les gros volumes

// POST /api/admin/books/bulk-import (Streaming NDJSON avec progression temps réel)
export async function POST(request: Request) {
    try {
        await verifyAdmin()

        const formData: any = await request.formData()
        const importType = formData.get?.('type') === 'stock' ? 'stock' : 'new'

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: Record<string, unknown>) => {
                    try {
                        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
                    } catch {
                        // Stream potentiellement fermé par le client
                    }
                }

                try {
                    const onProgress: ProgressCallback = (p) => {
                        sendEvent({ type: 'progress', ...p })
                    }

                    const result = importType === 'new'
                        ? await importBooksFromExcel(formData as any, onProgress, { skipAuthCheck: true })
                        : await updateStockFromTsv(formData as any, onProgress, { skipAuthCheck: true })

                    sendEvent({ type: 'complete', ...result })
                } catch (err: unknown) {
                    const error = err as Error
                    sendEvent({
                        type: 'complete',
                        success: false,
                        message: error?.message || 'Erreur lors du traitement',
                    })
                } finally {
                    try {
                        controller.close()
                    } catch {
                        // Déjà fermé
                    }
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Content-Type-Options': 'nosniff',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch (error: unknown) {
        const err = error as Error
        console.error('[API Bulk Import] Erreur:', err)
        return NextResponse.json(
            {
                success: false,
                message: err?.message || 'Une erreur est survenue lors du traitement du fichier.',
            },
            { status: 500 }
        )
    }
}
