import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        // Authentification via CRON_SECRET (optionnel mais recommandé)
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            // Permettre aussi de passer un token dans l'URL pour la simplicité
            const token = req.nextUrl.searchParams.get('token')
            if (token !== cronSecret) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        // Metrics
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem
        const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2)

        const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2)
        const usedMemGB = (usedMem / 1024 / 1024 / 1024).toFixed(2)

        const loadAvg = os.loadavg()
        const cpus = os.cpus().length

        const uptime = os.uptime()
        const uptimeDays = Math.floor(uptime / 86400)
        const uptimeHours = Math.floor((uptime % 86400) / 3600)

        // Tenter d'avoir l'espace disque (Linux/Mac)
        let diskUsage = 'Non disponible'
        try {
            if (os.platform() !== 'win32') {
                const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}'")
                diskUsage = stdout.trim()
            }
        } catch (e) {
            // Ignorer si erreur (ex: sous Windows)
        }

        const hostname = os.hostname()

        const message = `
🖥️ *Statut du Serveur VPS (${hostname})* 🖥️

*CPU*
- Coeurs : ${cpus}
- Charge (1m, 5m, 15m) : ${loadAvg.map(n => n.toFixed(2)).join(', ')}

*Mémoire (RAM)*
- Utilisée : ${usedMemGB} Go / ${totalMemGB} Go
- Pourcentage : ${memUsagePercent}%

*Disque*
- Utilisation (/) : ${diskUsage}

*Système*
- Uptime : ${uptimeDays}j ${uptimeHours}h
- OS : ${os.type()} ${os.release()}
`

        await sendTelegramMessage(message)

        return NextResponse.json({ success: true, message: 'Status sent to Telegram' })
    } catch (error: any) {
        console.error('Erreur VPS Status Cron:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
