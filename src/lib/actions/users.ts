'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

export async function getUsers() {
    try {
        await verifyAdmin(["ADMIN"])
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isBanned: true,
                createdAt: true,
                phone: true,
                managedLanguages: true,
                image: true,
                editorialRole: true,
                editorialDomains: true,
                editorialExperience: true,
                editorialMethodology: true,
            }
        })
        return { success: true, data: users }
    } catch (error) {
        return { success: false, error: 'Impossible de récupérer les utilisateurs' }
    }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
    try {
        await verifyAdmin(["ADMIN"])
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Erreur lors de la modification du rôle' }
    }
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
    try {
        await verifyAdmin(["ADMIN"])
        await prisma.user.update({
            where: { id: userId },
            data: { isBanned }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Erreur lors du bannissement' }
    }
}

export async function deleteUser(userId: string) {
    try {
        await verifyAdmin(["ADMIN"])
        await prisma.user.delete({
            where: { id: userId }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Erreur lors de la suppression' }
    }
}

export async function createUserAdmin(data: any) {
    try {
        await verifyAdmin(["ADMIN"])
        if (!data.email || !data.password) return { success: false, error: 'Email et mot de passe requis' }

        const hashedPassword = await hash(data.password, 10)
        await prisma.user.create({
            data: {
                email: data.email,
                fullName: data.fullName,
                password: hashedPassword,
                role: data.role as UserRole,
                managedLanguages: data.managedLanguages,
                image: data.image,
                bio: data.bio,
                facebook: data.facebook,
                instagram: data.instagram,
                twitter: data.twitter,
                editorialRole: data.editorialRole,
                editorialDomains: data.editorialDomains,
                editorialExperience: data.editorialExperience,
                editorialMethodology: data.editorialMethodology,
            }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'Email déjà utilisé' }
        return { success: false, error: 'Erreur lors de la création' }
    }
}

export async function updateUserAdmin(userId: string, data: any) {
    try {
        await verifyAdmin(["ADMIN"])
        if (!data.email) return { success: false, error: 'Email requis' }

        const updateData: any = {
            email: data.email,
            fullName: data.fullName,
            role: data.role as UserRole,
            managedLanguages: data.managedLanguages,
            image: data.image,
            bio: data.bio,
            facebook: data.facebook,
            instagram: data.instagram,
            twitter: data.twitter,
            editorialRole: data.editorialRole,
            editorialDomains: data.editorialDomains,
            editorialExperience: data.editorialExperience,
            editorialMethodology: data.editorialMethodology,
        }

        if (data.password && data.password.trim() !== '') {
            updateData.password = await hash(data.password, 10)
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'Email déjà utilisé par un autre compte' }
        return { success: false, error: 'Erreur lors de la modification' }
    }
}

export async function getLoginHistory(userId: string) {
    try {
        await verifyAdmin(["ADMIN"])
        const history = await prisma.loginHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limiter aux 50 dernières connexions
        })
        return { success: true, data: history }
    } catch (error) {
        return { success: false, error: 'Impossible de récupérer l\'historique des connexions' }
    }
}

export async function getGlobalLoginHistory() {
    try {
        await verifyAdmin(["ADMIN"])
        const history = await prisma.loginHistory.findMany({
            include: {
                user: {
                    select: {
                        email: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
        return { success: true, data: history }
    } catch (error) {
        return { success: false, error: 'Impossible de récupérer l\'historique global' }
    }
}
