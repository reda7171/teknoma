import 'server-only'

export async function readJsonBody(request: Request, maxBytes = 32 * 1024): Promise<unknown> {
    const declaredSize = Number(request.headers.get('content-length'))
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new Error('Request body too large')
    if (!request.body) throw new Error('Request body required')
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            length += value.byteLength
            if (length > maxBytes) {
                await reader.cancel()
                throw new Error('Request body too large')
            }
            chunks.push(value)
        }
    } finally { reader.releaseLock() }
    const data = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
    return JSON.parse(new TextDecoder().decode(data))
}
