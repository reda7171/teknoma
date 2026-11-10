'use server'

import { sanitizeHtml } from '@/lib/security'
import { requireRole } from '@/lib/require-role'

import { prisma } from '@/lib/prisma'
import { getCached } from '@/lib/cache'
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
    try {
        let decodedSlug = slug;
        try {
            decodedSlug = decodeURIComponent(slug);
        } catch {
            decodedSlug = slug;
        }

        const postInclude = {
            author: {
                select: {
                    id: true,
                    fullName: true,
                    image: true,
                    bio: true,
                    editorialRole: true,
                    _count: {
                        select: { posts: { where: { published: true } } }
                    }
                }
            },
            comments: {
                where: { isApproved: true },
                orderBy: { createdAt: 'desc' as const },
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

        // Priorité à l'article dans la langue demandée avant fallback pour redirection 301 canonique
        let post = language
            ? await prisma.post.findFirst({
                where: { slug: decodedSlug, published: true, language },
                include: postInclude
            })
            : null;

        if (!post) {
            post = await prisma.post.findFirst({
                where: { slug: decodedSlug, published: true },
                include: postInclude
            });
        }

    if (!post) {
        const normalizedSlug = decodedSlug
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()

        post = await prisma.post.findFirst({
            where: { slug: normalizedSlug, published: true },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        image: true,
                        bio: true,
                        editorialRole: true,
                        _count: {
                            select: { posts: { where: { published: true } } }
                        }
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
        });
    }

    return post;
    } catch {
        return null;
    }
}

// Admin / Internal Actions (Simplified for now)

/**
 * Récupère les derniers articles pour la page d'accueil (optionnel)
 */
export async function getRecentPosts(limit = 3, language: string = 'fr') {
    return getCached(
        `blog:recent-posts:${language}:${limit}`,
        async () => {
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
        },
        300
    )
}

/**
 * Récupère les articles en vedette pour la page d'accueil
 */
export async function getFeaturedPosts(limit = 3, language: string = 'fr') {
    return getCached(
        `blog:featured-posts:${language}:${limit}`,
        async () => {
            return prisma.post.findMany({
                where: { published: true, isFeatured: true, language },
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
        },
        300
    )
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
    bookId?: string,
    hasImage?: string
) {
    await requireRole(["ADMIN","MANAGER","BLOG_MODERATOR"])

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

    if (hasImage && hasImage !== 'all') {
        if (hasImage === 'true') {
            where.coverImage = { not: null, notIn: ['', '/book-placeholder.png'] }
        } else if (hasImage === 'false') {
            where.OR = [
                ...(where.OR || []),
                { coverImage: null },
                { coverImage: '' },
                { coverImage: '/book-placeholder.png' }
            ]
        }
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
    if (sort === 'seo_desc') orderBy = { seoScore: 'desc' }
    if (sort === 'seo_asc') orderBy = { seoScore: 'asc' }
    if (sort === 'status_desc') orderBy = { published: 'desc' }
    if (sort === 'status_asc') orderBy = { published: 'asc' }

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
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])
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

        const sanitizedContent = typeof data.content === 'string' ? data.content.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') : data.content
        const sanitizedExcerpt = typeof data.excerpt === 'string' ? data.excerpt.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') : data.excerpt

        await prisma.post.create({
            data: {
                title: data.title,
                slug: data.slug,
                excerpt: sanitizedExcerpt,
                content: sanitizeHtml(sanitizedContent || ''),
                coverImage: data.coverImage,
                published: data.published,
                publishedAt: data.published ? new Date() : null,
                authorId: adminId,
                authorName: data.authorName,
                category: data.category,
                tags: data.tags || null,
                language: data.language || 'fr',
                isFeatured: data.isFeatured || false,
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
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])

        const sanitizedContent = typeof data.content === 'string' ? data.content.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') : data.content
        const sanitizedExcerpt = typeof data.excerpt === 'string' ? data.excerpt.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') : data.excerpt

        await prisma.post.update({
            where: { id },
            data: {
                title: data.title,
                slug: data.slug,
                excerpt: sanitizedExcerpt,
                content: sanitizeHtml(sanitizedContent || ''),
                coverImage: data.coverImage,
                published: data.published,
                publishedAt: data.published && !data.publishedAt ? new Date() : data.publishedAt,
                authorId: data.authorId !== undefined ? data.authorId : undefined,
                authorName: data.authorName !== undefined ? data.authorName : undefined,
                category: data.category,
                tags: data.tags || null,
                language: data.language || 'fr',
                isCompleted: data.isCompleted !== undefined ? data.isCompleted : undefined,
                isFeatured: data.isFeatured !== undefined ? data.isFeatured : undefined,
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
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])

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
    await requireRole(["ADMIN","MANAGER","BLOG_MODERATOR"])

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
            category: true,
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
            authorName: true,
            author: { select: { id: true, fullName: true, image: true } }
        }
    })
}

/**
 * Récupère l'article précédent et le suivant (par date de publication)
 */
export async function getPrevNextPosts(postId: string, publishedAt: Date, language: string = 'fr') {
    const [prev, next] = await Promise.all([
        // Article précédent = le plus récent publié AVANT cet article
        prisma.post.findFirst({
            where: { published: true, language, id: { not: postId }, publishedAt: { lt: publishedAt } },
            orderBy: { publishedAt: 'desc' },
            select: { id: true, title: true, slug: true, coverImage: true }
        }),
        // Article suivant = le plus ancien publié APRÈS cet article
        prisma.post.findFirst({
            where: { published: true, language, id: { not: postId }, publishedAt: { gt: publishedAt } },
            orderBy: { publishedAt: 'asc' },
            select: { id: true, title: true, slug: true, coverImage: true }
        })
    ])
    return { prev, next }
}

/**
 * Incrémente le compteur de vues d'un article
 */
export async function incrementPostViews(id: string, country?: string) {
    try {
        const post = await prisma.post.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
            select: { title: true, viewCount: true }
        })



        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Log le temps de lecture d'un article
 */
export async function logPostReadTime(id: string, seconds: number) {
    try {
        await prisma.post.update({
            where: { id },
            data: { totalReadTime: { increment: Math.min(seconds, 300) } } // Cap à 5 min max par requête pour éviter les abus
        })
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
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])

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
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])

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

        const { getSetting } = await import('@/lib/server/site-settings')
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
