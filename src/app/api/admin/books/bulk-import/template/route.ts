import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET() {
    try {
        await verifyAdmin()

        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'Riwaya'
        workbook.created = new Date()

        const worksheet = workbook.addWorksheet('Livres')

        worksheet.columns = [
            { header: 'lang', key: 'lang', width: 10 },
            { header: 'nom', key: 'nom', width: 45 },
            { header: 'prix', key: 'prix', width: 16 },
            { header: 'ancien_prix', key: 'ancien_prix', width: 16 },
            { header: 'url', key: 'url', width: 65 },
            { header: 'image', key: 'image', width: 65 },
        ]

        // Style header row
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FF1E293B' }, size: 11 }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
        }
        headerRow.height = 24
        headerRow.alignment = { vertical: 'middle', horizontal: 'left' }

        const sampleRows = [
            {
                lang: 'fr',
                nom: 'Essais de psychanalyse - Sigmund Freud',
                prix: '145.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/fr/book-bank-publication-essais-de-psychanalyse-sigmund-freud-64639450.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/05/493646/1.jpg?2323',
            },
            {
                lang: 'fr',
                nom: 'pouvoir illimité',
                prix: '94.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/fr/book-bank-publication-pouvoir-illimite-64639407.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/493646/1.jpg?1683',
            },
            {
                lang: 'arb',
                nom: 'علم الإقتصاد ببساطة',
                prix: '110.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-economie-simplifiee-8711291.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/19/21178/1.jpg?8826',
            },
            {
                lang: 'arb',
                nom: 'علم المقابلات الجديد: دراسة علمية للمقابلات',
                prix: '210.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-interviewology-le-nouvel-art-de-l-entretien-87430195.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/59/103478/1.jpg?8658',
            },
            {
                lang: 'arb',
                nom: 'علم نفس القيادة: مبادئ خالدة لتحسين إدارتك للأفراد والفرق ولنفسك!',
                prix: '220.00 Dhs',
                ancien_prix: '',
                url: 'https://www.jumia.ma/ar/our-shop-la-psychologie-du-leadership-principes-intemporels-pour-ameliorer-votre-gestion-des-individus-des-equipes-et-de-vous-meme-87430311.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/11/303478/1.jpg?8731',
            },
            {
                lang: 'arb',
                nom: 'علمتني سورة البقرة',
                prix: '124.00 Dhs',
                ancien_prix: '170.00 Dhs',
                url: 'https://www.jumia.ma/ar/book-bank-publication-63903607.html',
                image: 'https://ma.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/70/630636/1.jpg?2563',
            },
        ]

        sampleRows.forEach((row) => {
            worksheet.addRow(row)
        })

        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="template_livres_riwaya.xlsx"',
            },
        })
    } catch (error: unknown) {
        const err = error as Error
        return NextResponse.json(
            { error: err?.message || 'Erreur lors de la génération du template' },
            { status: 500 }
        )
    }
}
