'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath } from 'next/cache'
import { CATEGORIES as DEFAULT_CATEGORIES, type CategoryTree } from '@/lib/constants/categories'
import { getSetting, updateSetting } from './site-settings'

const CATEGORY_TREE_KEY = 'category_tree'

export async function getCategoryTree(): Promise<CategoryTree> {
    try {
        const treeStr = await getSetting(CATEGORY_TREE_KEY)
        
        if (treeStr) {
            try {
                return JSON.parse(treeStr) as CategoryTree
            } catch (e) {
                console.error("Failed to parse category_tree setting", e)
            }
        }
        
        // If not found or invalid, save the default and return it
        const defaultStr = JSON.stringify(DEFAULT_CATEGORIES)
        
        // We do this in a try-catch because if a user visits a page triggering this,
        // they might not be an admin, and updateSetting calls verifyAdmin().
        // Actually, updateSetting requires Admin. We should use prisma directly for the seed.
        await prisma.siteSettings.upsert({
            where: { key: CATEGORY_TREE_KEY },
            update: { value: defaultStr },
            create: {
                key: CATEGORY_TREE_KEY,
                value: defaultStr,
                category: 'general',
                description: 'Hiérarchie des catégories et sous-catégories (JSON)'
            }
        })
        
        return DEFAULT_CATEGORIES
    } catch (error) {
        console.error('Error fetching category tree:', error)
        return DEFAULT_CATEGORIES
    }
}

export async function updateCategoryTree(tree: CategoryTree) {
    try {
        await verifyAdmin()
        
        const treeStr = JSON.stringify(tree)
        
        await prisma.siteSettings.upsert({
            where: { key: CATEGORY_TREE_KEY },
            update: { value: treeStr },
            create: {
                key: CATEGORY_TREE_KEY,
                value: treeStr,
                category: 'general',
                description: 'Hiérarchie des catégories et sous-catégories (JSON)'
            }
        })
        
        revalidatePath('/[locale]/admin/books/new', 'page')
        revalidatePath('/[locale]/admin/books/[id]/edit', 'page')
        revalidatePath('/[locale]/admin/config/categories', 'page')
        
        return { success: true }
    } catch (error) {
        console.error('Error updating category tree:', error)
        return { success: false, error: 'Erreur lors de la mise à jour des catégories' }
    }
}
