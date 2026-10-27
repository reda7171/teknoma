'use server'

import { prisma } from '@/lib/prisma'
import { seoPages } from '@/lib/seo-pages'

export async function migrateSeoPagesToDb() {
  try {
    for (const locale of Object.keys(seoPages)) {
      const pages = seoPages[locale]
      let order = 0
      for (const slug of Object.keys(pages)) {
        const page = pages[slug]
        
        // Use predefined gradients from SeoCategoriesSection if they don't have one
        const gradients = [
          'from-[#4A25E1] to-[#7A5AF8]', // Deep Purple
          'from-[#0F766E] to-[#042F2E]', // Emerald Dark
          'from-[#E11D48] to-[#881337]', // Rose/Red
          'from-[#0369A1] to-[#0C4A6E]', // Ocean Blue
          'from-[#B45309] to-[#78350F]', // Amber/Orange
          'from-[#9333EA] to-[#581C87]', // Pink/Purple
          'from-[#334155] to-[#0F172A]', // Slate Dark
          'from-[#0284C7] to-[#0369A1]'  // Sky Blue
        ]
        
        // Only show on home if it's one of the new 8 categories
        const newCategoriesSlugs = [
          'romans-arabes', 'romans-romantiques', 'romans-thriller-suspense', 
          'livres-developpement-personnel', 'livres-business-investissement', 
          'romans-marocains', 'idees-cadeaux-livres', 'livres-pas-chers',
          'riwayat-arabia', 'riwayat-romansiya', 'riwayat-tachwiq',
          'kotob-tatwir-adat', 'kotob-mal-istithmar', 'riwayat-maghribia',
          'kotob-hadaya', 'kotob-arabia-mounasiba',
          'arabic-novels', 'romantic-novels', 'thriller-suspense-novels',
          'self-help-books', 'business-investing-books', 'moroccan-novels',
          'book-gift-ideas', 'cheap-books'
        ]
        
        const showOnHome = newCategoriesSlugs.includes(slug)
        const color = showOnHome ? gradients[order % gradients.length] : null

        await prisma.seoCategory.upsert({
          where: { slug },
          update: {
            locale,
            title: page.title || '',
            h1: page.h1 || '',
            description: page.description || '',
            intro: page.intro || '',
            categoryText: page.categoryText || '',
            keyword: page.keyword || '',
            searchQuery: page.searchQuery || null,
            faq: JSON.stringify(page.faq || []),
            colorGradient: color,
            showOnHome,
            displayOrder: order
          },
          create: {
            slug,
            locale,
            title: page.title || '',
            h1: page.h1 || '',
            description: page.description || '',
            intro: page.intro || '',
            categoryText: page.categoryText || '',
            keyword: page.keyword || '',
            searchQuery: page.searchQuery || null,
            faq: JSON.stringify(page.faq || []),
            colorGradient: color,
            showOnHome,
            displayOrder: order
          }
        })
        if (showOnHome) order++
      }
    }
    return { success: true }
  } catch (error) {
    console.error('Migration failed:', error)
    return { success: false, error }
  }
}

export async function getSeoCategories() {
  return await prisma.seoCategory.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getSeoCategory(id: string) {
  return await prisma.seoCategory.findUnique({
    where: { id },
    include: {
      books: {
        include: {
          book: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })
}

export async function getSeoCategoryBySlug(slug: string) {
  return await prisma.seoCategory.findUnique({
    where: { slug },
    include: {
      books: {
        include: {
          book: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })
}

export async function getSeoCategoryPage(slug: string, locale: string) {
  const requested = await prisma.seoCategory.findUnique({
    where: { slug },
    include: {
      books: {
        include: { book: true },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!requested) return null

  const supportedLocale = ['fr', 'ar', 'en'].includes(locale) ? locale : 'fr'
  const requestedBookIds = new Set(requested.books.map(item => item.bookId))
  const canResolveTranslations = requestedBookIds.size > 0 && (requested.showOnHome || requested.displayOrder > 0)
  const candidates = canResolveTranslations
    ? await prisma.seoCategory.findMany({
        where: {
          displayOrder: requested.displayOrder,
          isActive: true,
          locale: { in: ['fr', 'ar', 'en'] }
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          slug: true,
          locale: true,
          books: { select: { bookId: true } }
        }
      })
    : []

  const translations = new Map<string, { slug: string; score: number }>()
  translations.set(requested.locale, { slug: requested.slug, score: 1 })

  for (const candidate of candidates) {
    const candidateBookIds = new Set(candidate.books.map(item => item.bookId))
    const intersection = [...requestedBookIds].filter(id => candidateBookIds.has(id)).length
    const union = new Set([...requestedBookIds, ...candidateBookIds]).size
    const score = union > 0 ? intersection / union : 0
    const current = translations.get(candidate.locale)
    if (score >= 0.8 && (!current || score > current.score)) {
      translations.set(candidate.locale, { slug: candidate.slug, score })
    }
  }

  const slugsByLocale = Object.fromEntries(
    [...translations].map(([translationLocale, item]) => [translationLocale, item.slug])
  ) as Partial<Record<'fr' | 'ar' | 'en', string>>

  if (requested.locale === supportedLocale) {
    return { category: requested, slugsByLocale }
  }

  const translatedSlug = slugsByLocale[supportedLocale as 'fr' | 'ar' | 'en']
  if (!translatedSlug) return null

  const category = await prisma.seoCategory.findUnique({
    where: { slug: translatedSlug },
    include: {
      books: {
        include: { book: true },
        orderBy: { order: 'asc' }
      }
    }
  })

  return category ? { category, slugsByLocale } : null
}

export async function getHomeSeoCategories(locale: string) {
  return await prisma.seoCategory.findMany({
    where: {
      locale,
      showOnHome: true,
      isActive: true
    },
    orderBy: {
      displayOrder: 'asc'
    },
    include: {
      books: {
        include: {
          book: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })
}

export async function getHeaderSeoCategories(locale: string) {
  return await prisma.seoCategory.findMany({
    where: {
      locale,
      isActive: true,
    },
    orderBy: [
      { displayOrder: 'asc' },
      { title: 'asc' },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      h1: true,
    },
  })
}

export async function createSeoCategory(data: any) {
  try {
    const category = await prisma.seoCategory.create({
      data: {
        slug: data.slug,
        locale: data.locale,
        title: data.title,
        h1: data.h1,
        description: data.description,
        intro: data.intro,
        categoryText: data.categoryText,
        keyword: data.keyword,
        searchQuery: data.searchQuery,
        colorGradient: data.colorGradient,
        faq: data.faq,
        showOnHome: data.showOnHome,
        isActive: data.isActive,
        displayOrder: data.displayOrder
      }
    })
    return { success: true, category }
  } catch (error) {
    return { success: false, error }
  }
}

export async function saveSeoCategory(id: string, data: any) {
  try {
    const category = await prisma.seoCategory.update({
      where: { id },
      data: {
        slug: data.slug,
        locale: data.locale,
        title: data.title,
        h1: data.h1,
        description: data.description,
        intro: data.intro,
        categoryText: data.categoryText,
        keyword: data.keyword,
        searchQuery: data.searchQuery,
        colorGradient: data.colorGradient,
        faq: data.faq,
        showOnHome: data.showOnHome,
        isActive: data.isActive,
        displayOrder: data.displayOrder
      }
    })
    return { success: true, category }
  } catch (error) {
    return { success: false, error }
  }
}

export async function deleteSeoCategory(id: string) {
  try {
    await prisma.seoCategory.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export async function updateSeoCategoryBooks(categoryId: string, bookIds: string[]) {
  try {
    // Supprimer toutes les relations existantes
    await prisma.seoCategoryBook.deleteMany({
      where: { seoCategoryId: categoryId }
    })

    // Créer les nouvelles
    for (let i = 0; i < bookIds.length; i++) {
      await prisma.seoCategoryBook.create({
        data: {
          seoCategoryId: categoryId,
          bookId: bookIds[i],
          order: i
        }
      })
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}
