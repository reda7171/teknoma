import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Metrics
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem
        const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2)
        const memPercentNum = parseFloat(memUsagePercent)
        const isCriticalMem = memPercentNum >= 85

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
            // Ignorer si erreur
        }

        const hostname = os.hostname()
        const alertOnly = req.nextUrl.searchParams.get('alert_only') === 'true'

        // Si alert_only est demandé et que la mémoire est normale (<85%), ne pas envoyer de message
        if (alertOnly && !isCriticalMem) {
            return NextResponse.json({
                success: true,
                alerted: false,
                memUsagePercent: `${memUsagePercent}%`,
                message: 'Utilisation RAM normale (< 85%)'
            })
        }

        const alertHeader = isCriticalMem
            ? `🚨 <b>ALERTE CRITIQUE RAM VPS : ${memUsagePercent}% (&gt; 85%)</b> 🚨\n⚠️ <i>Risque de saturation mémoire ou crash serveur !</i>\n\n`
            : ''

        const message = `${alertHeader}🖥️ <b>Statut du Serveur VPS (${hostname})</b>

<b>CPU</b>
- Coeurs : ${cpus}
- Charge (1m, 5m, 15m) : ${loadAvg.map(n => n.toFixed(2)).join(', ')}

<b>Mémoire (RAM)</b>
- Utilisée : ${usedMemGB} Go / ${totalMemGB} Go
- Pourcentage : <b>${memUsagePercent}%</b> ${isCriticalMem ? '⚠️ CRITIQUE' : '✅ OK'}

<b>Disque</b>
- Utilisation (/) : ${diskUsage}

<b>Système</b>
- Uptime : ${uptimeDays}j ${uptimeHours}h
- OS : ${os.type()} ${os.release()}
`

        // Si critique, purger automatiquement le cache .next en arrière-plan
        if (isCriticalMem && os.platform() !== 'win32') {
            execAsync('rm -rf /app/.next/cache 2>/dev/null || rm -rf .next/cache 2>/dev/null || true').catch(() => {})
        }

        await sendTelegramMessage(message)

        return NextResponse.json({
            success: true,
            alerted: isCriticalMem,
            memUsagePercent: `${memUsagePercent}%`,
            message: isCriticalMem ? 'Alerte critique Telegram envoyée' : 'Statut VPS envoyé sur Telegram'
        })
    } catch (error: any) {
        console.error('Erreur VPS Status Cron:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
