import { authorizeAdminApi } from '@/lib/api-authorization'

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

export async function POST() {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        // Find the main menu (usually slug 'header')
        const menu = await prisma.menu.findFirst({
            where: {
                OR: [
                    { slug: 'header' },
                    { slug: 'main' },
                    { name: { contains: 'principal' } }
                ]
            }
        })

        if (!menu) {
            return NextResponse.json({ error: 'Main menu not found' }, { status: 404 })
        }

        // Check if Authors already exists
        const existingItem = await prisma.menuItem.findFirst({
            where: {
                menuId: menu.id,
                url: { contains: 'authors' }
            }
        })

        if (existingItem) {
            return NextResponse.json({ message: 'Authors menu already exists', item: existingItem })
        }

        // Get the max order to append at the end
        const maxOrder = await prisma.menuItem.aggregate({
            where: { menuId: menu.id },
            _max: { order: true }
        })

        const newItem = await prisma.menuItem.create({
            data: {
                menuId: menu.id,
                label: 'Authors', // This will be translated via t('Authors') in the Header
                url: '/authors',
                order: (maxOrder._max.order || 0) + 1,
                isActive: true
            }
        })

        return NextResponse.json({ success: true, message: 'Authors menu added', item: newItem })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
