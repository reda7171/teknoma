'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { unlink } from 'fs/promises'
import { join, normalize } from 'path'
import { existsSync } from 'fs'

export async function getSchoolLists() {
    await verifyAdmin()
    return prisma.schoolList.findMany({
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateSchoolListStatus(id: string, status: string) {
    await verifyAdmin()
    return prisma.schoolList.update({
        where: { id },
        data: { status }
    })
}

export async function deleteSchoolList(id: string) {
    await verifyAdmin()
    const list = await prisma.schoolList.findUnique({ where: { id } })
    if (list?.fileUrl) {
        const filepath = normalize(join(process.cwd(), 'public', list.fileUrl))
        if (existsSync(filepath) && filepath.startsWith(join(process.cwd(), 'public', 'uploads'))) {
            await unlink(filepath)
        }
    }
    return prisma.schoolList.delete({ where: { id } })
}
