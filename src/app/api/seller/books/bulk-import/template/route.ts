import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'

export async function GET(request: Request) {
    try {
        const userId = await getAdminUser()
        const role = await getAdminRole()
        if (!userId || role !== 'SELLER') {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'xlsx'

        if (format === 'csv') {
            const csvContent = [
                'titre;auteur;prix;stock;isbn;langue;description;image',
                'L\'Alchimiste;Paulo Coelho;65;15;978-2290004449;fr;Un conte philosophique intemporel.;https://images.unsplash.com/photo-1544947950-fa07a98d237f',
                'Atomic Habits;James Clear;120;25;978-0735211292;en;An Easy and Proven Way to Build Good Habits.;https://images.unsplash.com/photo-1589829085413-56de8ae18c73',
                'مقدمة ابن خلدون;ابن خلدون;140;10;978-9953260000;ar;كتاب تاريخي وفلسفي رائد في علم الاجتماع والتاريخ.;https://images.unsplash.com/photo-1512820790803-83ca734da794'
            ].join('\n')

            return new NextResponse('\uFEFF' + csvContent, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="modele_import_catalogue_vendeur.csv"'
                }
            })
        }

        // Format Excel (.xlsx)
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Catalogue Vendeur', {
            views: [{ showGridLines: true }]
        })

        worksheet.columns = [
            { header: 'Titre *', key: 'title', width: 35 },
            { header: 'Auteur *', key: 'author', width: 25 },
            { header: 'Prix (MAD) *', key: 'price', width: 16 },
            { header: 'Stock *', key: 'stock', width: 12 },
            { header: 'ISBN', key: 'isbn', width: 20 },
            { header: 'Langue (fr/ar/en)', key: 'language', width: 18 },
            { header: 'Description', key: 'description', width: 45 },
            { header: 'Image URL', key: 'image', width: 35 }
        ]

        // Style en-têtes
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0274DF' } // Bleu Riwaya
        }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        headerRow.height = 28

        // Lignes d'exemples
        const sampleRows = [
            {
                title: 'L\'Alchimiste',
                author: 'Paulo Coelho',
                price: 65,
                stock: 15,
                isbn: '978-2290004449',
                language: 'fr',
                description: 'Un voyage initiatique qui a inspiré des millions de lecteurs à travers le monde.',
                image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f'
            },
            {
                title: 'Atomic Habits',
                author: 'James Clear',
                price: 120,
                stock: 25,
                isbn: '978-0735211292',
                language: 'en',
                description: 'Transform your habits and achieve remarkable results step by step.',
                image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73'
            },
            {
                title: 'مقدمة ابن خلدون',
                author: 'ابن خلدون',
                price: 140,
                stock: 10,
                isbn: '978-9953260000',
                language: 'ar',
                description: 'دراسة تأسيسية في فلسفة التاريخ وعلم الاجتماع البشري والعمران.',
                image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794'
            }
        ]

        sampleRows.forEach(row => worksheet.addRow(row))

        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="modele_import_catalogue_vendeur.xlsx"'
            }
        })
    } catch (error) {
        console.error('Erreur génération modèle import vendeur:', error)
        return NextResponse.json({ error: 'Erreur lors de la génération du modèle' }, { status: 500 })
    }
}
