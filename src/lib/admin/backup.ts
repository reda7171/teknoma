import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

export interface BackupFile {
    name: string
    size: number
    createdAt: Date
}

/**
 * Assure que le dossier de backup existe
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
}

/**
 * Parse DATABASE_URL pour extraire les infos MySQL
 */
function parseDatabaseUrl(url: string) {
    const parsed = new URL(url)
    if (parsed.protocol !== 'mysql:' || !parsed.hostname || !parsed.pathname.slice(1)) {
        throw new Error('Format DATABASE_URL invalide')
    }
    
    return {
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        host: parsed.hostname,
        port: parsed.port || '3306',
        database: decodeURIComponent(parsed.pathname.slice(1))
    }
}

function resolveBackupPath(filename: string) {
    if (!/^backup_[A-Za-z0-9_.-]+\.sql$/.test(filename) || path.basename(filename) !== filename) {
        return null
    }

    const filepath = path.resolve(BACKUP_DIR, filename)
    return filepath.startsWith(`${path.resolve(BACKUP_DIR)}${path.sep}`) ? filepath : null
}

/**
 * Génère un dump SQL
 */
export async function createBackup() {
    ensureBackupDir()
    
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) throw new Error('DATABASE_URL manquante')
    
    const config = parseDatabaseUrl(dbUrl)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup_${timestamp}.sql`
    const filepath = path.join(BACKUP_DIR, filename)
    
    try {
        const output = fs.createWriteStream(filepath, { flags: 'wx' })
        const dump = spawn('mysqldump', [
            '--skip-ssl',
            '-h', config.host,
            '-P', config.port,
            '-u', config.user,
            config.database
        ], {
            env: { ...process.env, MYSQL_PWD: config.password },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        })
        let stderr = ''
        dump.stderr.on('data', chunk => { stderr += chunk.toString() })

        const processCompleted = new Promise<void>((resolve, reject) => {
            dump.on('error', reject)
            dump.on('close', code => {
                if (code === 0) resolve()
                else reject(new Error(stderr.trim() || `mysqldump terminé avec le code ${code}`))
            })
        })

        await Promise.all([pipeline(dump.stdout, output), processCompleted])
        return { filename, filepath }
    } catch (error) {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
        console.error('Erreur mysqldump:', error)
        throw new Error('Erreur lors de la génération du dump')
    }
}

/**
 * Liste les backups existants
 */
export async function listBackups(): Promise<BackupFile[]> {
    ensureBackupDir()
    const files = fs.readdirSync(BACKUP_DIR)
    
    return files
        .filter(f => f.endsWith('.sql'))
        .map(f => {
            const stats = fs.statSync(path.join(BACKUP_DIR, f))
            return {
                name: f,
                size: stats.size,
                createdAt: stats.birthtime
            }
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Supprime un backup
 */
export async function deleteBackup(filename: string) {
    const filepath = resolveBackupPath(filename)
    if (!filepath) return false
    if (fs.existsSync(/* turbopackIgnore: true */ filepath)) {
        fs.unlinkSync(/* turbopackIgnore: true */ filepath)
        return true
    }
    return false
}

/**
 * Récupère le chemin d'un backup pour téléchargement
 */
export function getBackupPath(filename: string) {
    const filepath = resolveBackupPath(filename)
    if (!filepath) return null
    if (fs.existsSync(/* turbopackIgnore: true */ filepath)) {
        return filepath
    }
    return null
}
