'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { deleteAudioFile } from './upload-audio'
import { revalidatePath } from 'next/cache'
import { getCached } from '@/lib/cache'

export async function getAudioTestimonials() {
    try {
        const testimonials = await prisma.audioTestimonial.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, testimonials }
    } catch (error) {
        console.error('[GET AUDIO TESTIMONIALS]', error)
        return { success: false, error: 'Erreur lors de la récupération des témoignages audio' }
    }
}

export async function getApprovedAudioTestimonials(limit?: number) {
    return getCached(`testimonials:audio:approved:${limit ?? 'all'}`, async () => {
        try {
            const testimonials = await prisma.audioTestimonial.findMany({
                where: { isApproved: true },
                orderBy: { createdAt: 'desc' },
                ...(limit ? { take: limit } : {}),
            })
            return { success: true, testimonials }
        } catch (error) {
            console.error('[GET APPROVED AUDIO TESTIMONIALS]', error)
            return { success: false, error: 'Erreur lors de la récupération des témoignages audio' }
        }
    }, 3600) // 1 hour cache
}

export async function createAudioTestimonial(data: { customerName: string, audioUrl: string, duration?: number }) {
    try {
        await verifyAdmin()
        
        if (!data.customerName || !data.audioUrl) {
            return { success: false, error: 'Le nom du client et l\'URL audio sont requis' }
        }

        const testimonial = await prisma.audioTestimonial.create({
            data: {
                customerName: data.customerName,
                audioUrl: data.audioUrl,
                duration: data.duration
            }
        })
        revalidatePath('/', 'layout')
        return { success: true, testimonial }
    } catch (error) {
        console.error('[CREATE AUDIO TESTIMONIAL]', error)
        return { success: false, error: 'Erreur lors de la création du témoignage' }
    }
}

export async function toggleAudioTestimonialStatus(id: string, isApproved: boolean) {
    try {
        await verifyAdmin()
        await prisma.audioTestimonial.update({
            where: { id },
            data: { isApproved }
        })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('[TOGGLE AUDIO TESTIMONIAL]', error)
        return { success: false, error: 'Erreur lors de la mise à jour du statut' }
    }
}

export async function deleteAudioTestimonial(id: string) {
    try {
        await verifyAdmin()
        
        // Retrieve testimonial first to get the audio URL
        const testimonial = await prisma.audioTestimonial.findUnique({
            where: { id }
        })

        if (!testimonial) {
            return { success: false, error: 'Témoignage introuvable' }
        }

        // Delete the file from local storage
        if (testimonial.audioUrl) {
            await deleteAudioFile(testimonial.audioUrl)
        }

        // Delete from database
        await prisma.audioTestimonial.delete({
            where: { id }
        })

        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('[DELETE AUDIO TESTIMONIAL]', error)
        return { success: false, error: 'Erreur lors de la suppression' }
    }
}
