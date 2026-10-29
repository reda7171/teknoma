import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { randomUUID } from 'crypto'

/**
 * API pour générer un backup SQL de la base de données
 * Nécessite mysql-client installé sur le serveur/conteneur
 */
export async function GET() {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        const dbUrl = process.env.DATABASE_URL || ''

        let user, password, host, port, dbname;

        try {
            const url = new URL(dbUrl)
            user = url.username
            password = url.password
            host = url.hostname
            port = url.port || '3306'
            dbname = url.pathname.substring(1).split('?')[0] // Remove leading slash and query params
        } catch {
            return NextResponse.json({ error: 'DATABASE_URL format invalide' }, { status: 500 })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `backup_petsunivers_${timestamp}.sql`
        const tempPath = path.join(os.tmpdir(), `petsunivers-${randomUUID()}.sql`)

        // On utilise spawn pour éviter les problèmes d'échappement du shell
        return new Promise<NextResponse>((resolve) => {
            const writeStream = fs.createWriteStream(tempPath)

            const mysqldump = spawn('mysqldump', [
                '--skip-ssl',
                '-h', host,
                '-P', port,
                '-u', user,
                dbname
            ], {
                env: { ...process.env, MYSQL_PWD: password }
            })

            mysqldump.stdout.pipe(writeStream)

            let errorData = ''
            mysqldump.stderr.on('data', (data) => {
                errorData += data.toString()
            })

            mysqldump.on('close', (code) => {
                if (code !== 0) {
                    console.error('Mysqldump error:', errorData)
                    // Nettoyer le fichier vide/incomplet
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)

                    let errorMessage = 'Erreur lors de l\'exécution de mysqldump.'
                    const isWindows = process.platform === 'win32'

                    if (errorData.includes('not recognized') || errorData.includes('ENOENT')) {
                        errorMessage += ' L\'utilitaire "mysqldump" est introuvable. ' +
                            (isWindows
                                ? 'Veuillez installer MySQL et ajouter le dossier "bin" à votre PATH.'
                                : 'Veuillez installer "mysql-client" sur votre serveur.')
                    }

                    resolve(NextResponse.json({
                        error: errorMessage,
                        details: errorData || `Process exited with code ${code}`
                    }, { status: 500 }))
                    return
                }

                // Lire le fichier généré
                const fileBuffer = fs.readFileSync(tempPath)
                fs.unlinkSync(tempPath)

                resolve(new NextResponse(fileBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/sql',
                        'Content-Disposition': `attachment; filename="${filename}"`,
                    },
                }))
            })

            mysqldump.on('error', (err: NodeJS.ErrnoException) => {
                console.error('Spawn error:', err)
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)

                let errorMessage = 'Erreur lors du lancement de mysqldump.'
                if (err.code === 'ENOENT') {
                    errorMessage += ' L\'utilitaire "mysqldump" est introuvable.'
                }

                resolve(NextResponse.json({
                    error: errorMessage,
                    details: err.message
                }, { status: 500 }))
            })
        })

    } catch (error: unknown) {
        console.error('Backup API error:', error)
        const message = error instanceof Error ? error.message : 'Erreur lors du backup'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
