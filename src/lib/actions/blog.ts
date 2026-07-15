'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin, getAdminUser } from '@/lib/actions/auth'

// Public Actions

/**
 * Récupère les articles de blog publiés avec pagination
 */
export async function getPublishedPosts(page: number = 1, limit: number = 9, category?: string, language: string = 'fr') {
    const skip = (page - 1) * limit
    const where: any = { published: true, language }
    if (category) {
        where.category = category
    }

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where,
            skip,
            take: limit,
            orderBy: { publishedAt: 'desc' },
            include: {
                author: {
                    select: {
                        fullName: true,
                        image: true
                    }
                },
                _count: {
                    select: {
                        comments: {
                            where: { isApproved: true }
                        }
                    }
                }
            }
        }),
        prisma.post.count({ where })
    ])

    return {
        posts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

/**
 * Récupère les catégories uniques
 */
export async function getPostCategories(language: string = 'fr') {
    const categories = await prisma.post.findMany({
        where: { published: true, category: { not: null }, language },
        select: { category: true },
        distinct: ['category']
    })
    return categories.map((c) => c.category).filter(Boolean) as string[]
}

/**
 * Récupère un article par son slug
 */
export async function getPostBySlug(slug: string, language?: string) {
    // Normaliser : supprimer les accents (ex: î → i) pour robustesse URL → DB
    const normalizedSlug = slug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const where: any = { slug: normalizedSlug, published: true }

    return prisma.post.findFirst({
        where,
        include: {
            author: {
                select: {
                    fullName: true,
                    image: true,
                    bio: true
                }
            },
            comments: {
                where: { isApproved: true },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { fullName: true, image: true }
                    }
                }
            },
            _count: {
                select: { comments: { where: { isApproved: true } } }
            },
            books: {
                select: {
                    id: true,
                    title: true,
                    author: true,
                    description: true,
                    bestQuote: true,
                    bestLessons: true,
                    bestFor: true,
                    bestChapters: true,
                    price: true,
                    image: true,
                    stock: true
                }
            }
        }
    })
}

// Admin / Internal Actions (Simplified for now)

/**
 * Récupère les derniers articles pour la page d'accueil (optionnel)
 */
export async function getRecentPosts(limit = 3, language: string = 'fr') {
    return prisma.post.findMany({
        where: { published: true, language },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true,
            author: {
                select: {
                    fullName: true
                }
            }
        }
    })
}

// ============================================
// ADMIN ACTIONS
// ============================================

export async function getAllPosts(
    page = 1,
    limit = 20,
    search?: string,
    language?: string,
    published?: boolean | null,
    category?: string,
    authorId?: string,
    sort?: string,
    dateFrom?: string,
    dateTo?: string,
    bookId?: string
) {
    const skip = (page - 1) * limit
    const where: any = {}

    if (search) {
        where.title = { contains: search }
    }

    if (language && language !== 'all') {
        where.language = language
    }

    if (published !== undefined && published !== null) {
        where.published = published
    }

    if (category && category !== 'all') {
        where.category = category
    }

    if (authorId && authorId !== 'all') {
        where.authorId = authorId
    }

    if (bookId && bookId !== 'all') {
        where.books = { some: { id: bookId } }
    }

    if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) {
            const toDate = new Date(dateTo)
            toDate.setHours(23, 59, 59, 999)
            where.createdAt.lte = toDate
        }
    }

    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'oldest') orderBy = { createdAt: 'asc' }
    if (sort === 'views_desc') orderBy = { viewCount: 'desc' }
    if (sort === 'views_asc') orderBy = { viewCount: 'asc' }

    const [posts, total] = await prisma.$transaction([
        prisma.post.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                author: {
                    select: { fullName: true }
                },
                _count: {
                    select: { books: true }
                }
            }
        }),
        prisma.post.count({ where })
    ])

    return {
        posts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export async function createPost(data: any) {
    try {
        await verifyAdmin()
        const adminId = await getAdminUser()

        if (!adminId) {
            return { success: false, error: 'Session invalide' }
        }

        // Ensure slug is unique
        const existing = await prisma.post.findUnique({
            where: { slug: data.slug }
        })

        if (existing) {
            return { success: false, error: 'Ce slug existe déjà' }
        }

        await prisma.post.create({
            data: {
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt,
                content: data.content,
                coverImage: data.coverImage,
                published: data.published,
                publishedAt: data.published ? new Date() : null,
                authorId: adminId,
                authorName: data.authorName,
                category: data.category,
                tags: data.tags || null,
                language: data.language || 'fr',
                books: data.bookIds ? {
                    connect: data.bookIds.map((id: string) => ({ id }))
                } : undefined
            }
        })

        revalidatePath('/blog')
        revalidatePath('/admin/posts')
        return { success: true }
    } catch (error) {
        console.error('Error creating post:', error)
        return { success: false, error: 'Erreur lors de la création' }
    }
}

export async function updatePost(id: string, data: any) {
    try {
        await verifyAdmin()

        await prisma.post.update({
            where: { id },
            data: {
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt,
                content: data.content,
                coverImage: data.coverImage,
                published: data.published,
                publishedAt: data.published && !data.publishedAt ? new Date() : data.publishedAt,
                authorId: data.authorId || undefined,
                authorName: data.authorName,
                category: data.category,
                tags: data.tags || null,
                language: data.language || 'fr',
                books: {
                    set: data.bookIds ? data.bookIds.map((id: string) => ({ id })) : []
                }
            }
        })

        revalidatePath('/blog')
        revalidatePath(`/blog/${data.slug}`)
        revalidatePath('/admin/posts')
        return { success: true }
    } catch (error) {
        console.error('Error updating post:', error)
        return { success: false, error: 'Erreur lors de la mise à jour' }
    }
}

export async function deletePost(id: string) {
    try {
        await verifyAdmin()

        await prisma.post.delete({
            where: { id }
        })

        revalidatePath('/blog')
        revalidatePath('/admin/posts')
        return { success: true }
    } catch (error) {
        console.error('Error deleting post:', error)
        return { success: false, error: 'Erreur lors de la suppression' }
    }
}

export async function getPostById(id: string) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            books: {
                select: { id: true, title: true }
            }
        }
    })
}

/**
 * Récupère les articles parlant d'un livre spécifique
 */
export async function getPostsByBookId(bookId: string, language?: string) {
    return prisma.post.findMany({
        where: {
            published: true,
            ...(language ? { language } : {}),
            books: {
                some: { id: bookId }
            }
        },
        orderBy: { publishedAt: 'desc' },
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true
        }
    })
}

/**
 * Récupère les articles similaires (même catégorie)
 */
export async function getRelatedPosts(postId: string, category: string | null, language: string = 'fr', limit = 3) {
    return prisma.post.findMany({
        where: {
            published: true,
            language,
            id: { not: postId },
            ...(category ? { category } : {})
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true,
            category: true,
            author: { select: { fullName: true } }
        }
    })
}

/**
 * Incrémente le compteur de vues d'un article
 */
export async function incrementPostViews(id: string) {
    try {
        const post = await prisma.post.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
            select: { title: true, viewCount: true }
        })

        try {
            const { sendTelegramMessage } = await import('@/lib/telegram')
            await sendTelegramMessage(`📖 <b>Nouvelle lecture d'article !</b>\n\n📌 <b>Titre:</b> ${post.title}\n👁️ <b>Vues totales:</b> ${post.viewCount}`)
        } catch (e) {
            console.error("Erreur envoi telegram view:", e)
        }

        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Supprime plusieurs articles d'un coup (Bulk Delete)
 */
export async function deletePostsBulk(ids: string[]) {
    try {
        await verifyAdmin()

        await prisma.post.deleteMany({
            where: {
                id: { in: ids }
            }
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('Error deleting posts bulk:', error)
        return { success: false, error: 'Une erreur est survenue lors de la suppression' }
    }
}

/**
 * Partager un article vers Facebook via webhook n8n
 */
export async function sharePostToN8n(postId: string) {
    try {
        await verifyAdmin()

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                coverImage: true,
                language: true
            }
        })

        if (!post) return { success: false, error: 'Article introuvable' }

        const { getSetting } = await import('@/lib/actions/site-settings')
        const n8nWebhook = await getSetting('n8n_facebook_webhook')
        const siteUrl = await getSetting('site_url') || 'https://riwaya.store'

        if (!n8nWebhook) {
            return { success: false, error: 'Le webhook n8n n\'est pas configuré dans les paramètres du site (clé: n8n_facebook_webhook)' }
        }

        const postUrl = `${siteUrl}/${post.language}/blog/${post.slug}`
        const imageUrl = post.coverImage?.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`

        const payload = {
            id: post.id,
            title: post.title,
            excerpt: post.excerpt || '',
            url: postUrl,
            image: imageUrl,
            language: post.language
        }

        const response = await fetch(n8nWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            return { success: false, error: 'Erreur lors de l\'envoi à n8n' }
        }

        return { success: true }
    } catch (error) {
        console.error('Error sharing post to n8n:', error)
        return { success: false, error: 'Une erreur est survenue' }
    }
}


