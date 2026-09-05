'use server'

import { prisma } from '@/lib/prisma'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { revalidatePath } from 'next/cache'

/**
 * Récupère l'ID du vendeur (admin-token ou community-token)
 */
async function getSellerUserId(): Promise<string | null> {
    let userId = await getAdminUser()
    let role = await getAdminRole()
    if (userId && role === 'SELLER') return userId

    const commId = await getCommunityUser()
    if (commId) {
        const user = await prisma.user.findUnique({ where: { id: commId } })
        if (user?.role === 'SELLER') return commId
    }
    return null
}

/**
 * Récupère les articles du vendeur connecté
 */
export async function getSellerPosts() {
    const userId = await getSellerUserId()
    if (!userId) throw new Error('Non autorisé')

    return prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            createdAt: true,
            viewCount: true,
            category: true,
            coverImage: true,
            excerpt: true,
        }
    })
}

/**
 * Crée un article en attente d'approbation
 */
export async function createSellerPost(data: {
    title: string
    excerpt: string
    content: string
    coverImage?: string
    category?: string
}) {
    const userId = await getSellerUserId()
    if (!userId) return { success: false, error: 'Non autorisé' }

    try {
        // Générer un slug unique
        const baseSlug = data.title
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 80)
        const uniqueSlug = `${baseSlug}-${Date.now()}`

        const post = await prisma.post.create({
            data: {
                title: data.title,
                excerpt: data.excerpt,
                content: data.content,
                coverImage: data.coverImage || null,
                category: data.category || null,
                slug: uniqueSlug,
                authorId: userId,
                published: false, // En attente d'approbation admin
                language: 'fr',
            }
        })
        revalidatePath('/seller/blog')
        return { success: true, post }
    } catch (error) {
        console.error('createSellerPost:', error)
        return { success: false, error: 'Erreur lors de la création.' }
    }
}

/**
 * Supprime un article (seulement les articles non publiés du vendeur)
 */
export async function deleteSellerPost(postId: string) {
    const userId = await getSellerUserId()
    if (!userId) return { success: false, error: 'Non autorisé' }

    try {
        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post || post.authorId !== userId) {
            return { success: false, error: 'Article introuvable.' }
        }
        if (post.published) {
            return { success: false, error: 'Vous ne pouvez pas supprimer un article publié.' }
        }
        await prisma.post.delete({ where: { id: postId } })
        revalidatePath('/seller/blog')
        return { success: true }
    } catch (error) {
        console.error('deleteSellerPost:', error)
        return { success: false, error: 'Erreur lors de la suppression.' }
    }
}

/**
 * Met à jour un article non encore publié
 */
export async function updateSellerPost(postId: string, data: {
    title?: string
    excerpt?: string
    content?: string
    coverImage?: string
    category?: string
}) {
    const userId = await getSellerUserId()
    if (!userId) return { success: false, error: 'Non autorisé' }

    try {
        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post || post.authorId !== userId) {
            return { success: false, error: 'Article introuvable.' }
        }
        if (post.published) {
            return { success: false, error: 'Article déjà publié, modification non autorisée.' }
        }
        await prisma.post.update({ where: { id: postId }, data })
        revalidatePath('/seller/blog')
        return { success: true }
    } catch (error) {
        console.error('updateSellerPost:', error)
        return { success: false, error: 'Erreur lors de la mise à jour.' }
    }
}
