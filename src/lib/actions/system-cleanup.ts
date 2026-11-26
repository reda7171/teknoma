'use server'

import { verifyAdmin } from '@/lib/actions/auth'
import { cleanOrphanImages } from '@/app/api/cron/clean-orphan-images/route'
import { revalidatePath } from 'next/cache'

export async function runOrphanImagesCleanup() {
    try {
        await verifyAdmin()
        const result = await cleanOrphanImages()

        revalidatePath('/admin/products')
        revalidatePath('/admin/packs')
        revalidatePath('/books')
        revalidatePath('/packs')

        return {
            success: true,
            message: `Nettoyage effectué : ${result.cleaned.total} image(s) orpheline(s) corrigée(s)`,
            cleaned: result.cleaned
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erreur lors du nettoyage des images orphelines'
        }
    }
}
