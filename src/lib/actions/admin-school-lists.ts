'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { privateFilePath } from '@/lib/private-file-path'
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
        const filename = decodeURIComponent(list.fileUrl.split('/').pop() || '')
        for (const root of [join(process.cwd(), 'data', 'private-school-lists'), join(process.cwd(), 'public', 'uploads', 'school-lists')]) {
            const filepath = privateFilePath(root, filename)
            if (filepath && existsSync(filepath)) await unlink(filepath)
        }
    }
    return prisma.schoolList.delete({ where: { id } })
}
