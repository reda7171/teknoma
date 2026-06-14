/**
 * Export vidéo via Canvas + MediaRecorder API (100% natif, sans dépendances)
 * Ajoute un effet Ken Burns sur l'image statique pour animer la vidéo
 */

import * as htmlToImage from 'html-to-image'

export interface VideoExportOptions {
    element?: HTMLElement
    imagesDataUrls?: string[]
    duration?: number
    fps?: number
    filename?: string
    onProgress?: (pct: number) => void
}

export async function exportToMp4(opts: VideoExportOptions): Promise<void> {
    const { element, imagesDataUrls, duration = 5, fps = 30, filename = 'short.mp4', onProgress } = opts
    const totalMs = duration * 1000

    onProgress?.(5)

    let dataUrls: string[] = []

    if (imagesDataUrls && imagesDataUrls.length > 0) {
        dataUrls = imagesDataUrls
    } else if (element) {
        // 1. Capture du DOM en PNG haute résolution
        const dataUrl = await htmlToImage.toPng(element, {
            quality: 1,
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: false,
        })
        dataUrls.push(dataUrl)
    } else {
        throw new Error("No element or imagesDataUrls provided")
    }

    onProgress?.(20)

    // 2. Charger les images dans des objets Image
    const imgs: HTMLImageElement[] = []
    for (const url of dataUrls) {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = url
        })
        imgs.push(img)
    }

    // 3. Créer un canvas aux dimensions de la première image
    const canvas = document.createElement('canvas')
    canvas.width = imgs[0].width
    canvas.height = imgs[0].height
    const ctx = canvas.getContext('2d')!

    onProgress?.(30)

    // 4. Choisir le meilleur codec disponible
    const mimeType = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

    // 5. Démarrer MediaRecorder sur le stream du canvas
    const stream = canvas.captureStream(fps)
    const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
    })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    return new Promise((resolve, reject) => {
        recorder.onstop = () => {
            onProgress?.(98)
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
            const blob = new Blob(chunks, { type: mimeType })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename.replace(/\.(mp4|webm)$/i, `.${ext}`)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 500)
            onProgress?.(100)
            resolve()
        }

        recorder.onerror = () => reject(new Error('MediaRecorder error'))

        recorder.start()

        // 6. Effet Ken Burns : zoom 1 → 1.08 + légère translation
        const startTime = performance.now()
        const imageDurationMs = totalMs / imgs.length

        const animate = () => {
            const elapsed = performance.now() - startTime
            const progress = Math.min(elapsed / totalMs, 1)

            const currentImgIndex = Math.min(Math.floor(elapsed / imageDurationMs), imgs.length - 1)
            const imgProgress = (elapsed % imageDurationMs) / imageDurationMs
            const img = imgs[currentImgIndex]

            const scale = 1 + imgProgress * 0.08
            const tx = imgProgress * canvas.width * 0.02
            const ty = imgProgress * canvas.height * 0.01

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.save()
            ctx.translate(tx, ty)
            ctx.scale(scale, scale)
            ctx.drawImage(img,
                -((scale - 1) * canvas.width) / 2,
                -((scale - 1) * canvas.height) / 2,
                canvas.width, canvas.height
            )
            ctx.restore()

            onProgress?.(30 + Math.round(progress * 65))

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                recorder.stop()
                stream.getTracks().forEach(t => t.stop())
            }
        }

        requestAnimationFrame(animate)
    })
}
