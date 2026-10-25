'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface SupplierContactData {
    id?: string
    name: string
    company?: string | null
    domain: string
    phone: string
    email?: string | null
    city?: string | null
    address?: string | null
    website?: string | null
    notes?: string | null
    rating?: number | null
    isActive?: boolean
}

/**
 * Récupère tous les fournisseurs et contacts externes avec filtres optionnels
 */
export async function getSupplierContacts(filters?: { search?: string; domain?: string; activeOnly?: boolean }) {
    try {
        // Tentative via le modèle Prisma typé
        let contacts: any[] = []

        if ((prisma as any).supplierContact) {
            const where: any = {}
            if (filters?.activeOnly) where.isActive = true
            if (filters?.domain && filters.domain !== 'all') where.domain = filters.domain
            if (filters?.search && filters.search.trim()) {
                const s = filters.search.trim()
                where.OR = [
                    { name: { contains: s } },
                    { company: { contains: s } },
                    { phone: { contains: s } },
                    { city: { contains: s } },
                    { notes: { contains: s } }
                ]
            }
            contacts = await (prisma as any).supplierContact.findMany({
                where,
                orderBy: { updatedAt: 'desc' }
            })
        } else {
            // Fallback SQL direct si le client Prisma n'a pas encore rechargé les types en mémoire
            let query = 'SELECT * FROM supplier_contacts WHERE 1=1'
            const params: any[] = []

            if (filters?.activeOnly) {
                query += ' AND isActive = 1'
            }
            if (filters?.domain && filters.domain !== 'all') {
                query += ' AND domain = ?'
                params.push(filters.domain)
            }
            if (filters?.search && filters.search.trim()) {
                const s = `%${filters.search.trim()}%`
                query += ' AND (name LIKE ? OR company LIKE ? OR phone LIKE ? OR city LIKE ? OR notes LIKE ?)'
                params.push(s, s, s, s, s)
            }
            query += ' ORDER BY updatedAt DESC'

            contacts = await prisma.$queryRawUnsafe(query, ...params)
        }

        return { success: true, contacts }
    } catch (error: any) {
        console.error('Erreur getSupplierContacts:', error)
        return { success: false, error: error.message, contacts: [] }
    }
}

/**
 * Créer ou mettre à jour un contact fournisseur
 */
export async function saveSupplierContact(data: SupplierContactData) {
    try {
        if (!data.name?.trim()) return { success: false, error: 'Le nom du contact est obligatoire' }
        if (!data.phone?.trim()) return { success: false, error: 'Le numéro de téléphone est obligatoire' }
        if (!data.domain?.trim()) return { success: false, error: 'Le domaine est obligatoire' }

        const id = data.id || `sup-${Date.now()}`

        if ((prisma as any).supplierContact) {
            await (prisma as any).supplierContact.upsert({
                where: { id },
                update: {
                    name: data.name.trim(),
                    company: data.company?.trim() || null,
                    domain: data.domain.trim(),
                    phone: data.phone.trim(),
                    email: data.email?.trim() || null,
                    city: data.city?.trim() || null,
                    address: data.address?.trim() || null,
                    website: data.website?.trim() || null,
                    notes: data.notes?.trim() || null,
                    rating: data.rating ?? 5,
                    isActive: data.isActive ?? true
                },
                create: {
                    id,
                    name: data.name.trim(),
                    company: data.company?.trim() || null,
                    domain: data.domain.trim(),
                    phone: data.phone.trim(),
                    email: data.email?.trim() || null,
                    city: data.city?.trim() || null,
                    address: data.address?.trim() || null,
                    website: data.website?.trim() || null,
                    notes: data.notes?.trim() || null,
                    rating: data.rating ?? 5,
                    isActive: data.isActive ?? true
                }
            })
        } else {
            await prisma.$executeRawUnsafe(
                `INSERT INTO supplier_contacts (id, name, company, domain, phone, email, city, address, website, notes, rating, isActive, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name), company = VALUES(company), domain = VALUES(domain),
                    phone = VALUES(phone), email = VALUES(email), city = VALUES(city),
                    address = VALUES(address), website = VALUES(website), notes = VALUES(notes),
                    rating = VALUES(rating), isActive = VALUES(isActive), updatedAt = NOW(3)`,
                id, data.name.trim(), data.company?.trim() || null, data.domain.trim(),
                data.phone.trim(), data.email?.trim() || null, data.city?.trim() || null,
                data.address?.trim() || null, data.website?.trim() || null,
                data.notes?.trim() || null, data.rating ?? 5, data.isActive === false ? 0 : 1
            )
        }

        revalidatePath('/admin/suppliers')
        return { success: true, id }
    } catch (error: any) {
        console.error('Erreur saveSupplierContact:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Supprimer un contact
 */
export async function deleteSupplierContact(id: string) {
    try {
        if (!id) return { success: false, error: 'Identifiant manquant' }

        if ((prisma as any).supplierContact) {
            await (prisma as any).supplierContact.delete({ where: { id } })
        } else {
            await prisma.$executeRawUnsafe(`DELETE FROM supplier_contacts WHERE id = ?`, id)
        }

        revalidatePath('/admin/suppliers')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur deleteSupplierContact:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Activer / Désactiver un contact
 */
export async function toggleSupplierContactStatus(id: string, nextStatus: boolean) {
    try {
        if ((prisma as any).supplierContact) {
            await (prisma as any).supplierContact.update({
                where: { id },
                data: { isActive: nextStatus }
            })
        } else {
            await prisma.$executeRawUnsafe(
                `UPDATE supplier_contacts SET isActive = ?, updatedAt = NOW(3) WHERE id = ?`,
                nextStatus ? 1 : 0, id
            )
        }

        revalidatePath('/admin/suppliers')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur toggleSupplierContactStatus:', error)
        return { success: false, error: error.message }
    }
}
