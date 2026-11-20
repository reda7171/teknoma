'use server'

import { prisma } from '@/lib/prisma'
import { getAdminUser, isAuthenticated } from '@/lib/actions/auth'
import { getWhatsAppAgents, resolveActiveWhatsAppAgent, WhatsAppAgentConfig } from '@/lib/whatsapp-presence'
import { revalidatePath } from 'next/cache'

export interface AgentPresenceItem extends WhatsAppAgentConfig {
    online: boolean
}

export async function getWhatsAppAvailabilityPrompt() {
    try {
        const agents = await getWhatsAppAgents()
        const keys = agents.map(a => `whatsapp_presence_${a.id}`)
        const presenceSettings = await prisma.siteSettings.findMany({
            where: { key: { in: keys } },
        })
        const presenceMap = new Map(presenceSettings.map(s => [s.key, s.value]))

        // Try detecting logged-in admin email
        let detectedAgentId: string | null = null
        try {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            const adminEmail = cookieStore.get('admin-email')?.value?.toLowerCase()
            if (adminEmail) {
                const matched = agents.find(a => a.email && a.email.toLowerCase() === adminEmail)
                if (matched) detectedAgentId = matched.id
            }
        } catch {}

        const now = Date.now()
        const TTL = 24 * 60 * 60 * 1000

        const agentsWithStatus: AgentPresenceItem[] = agents.map(agent => {
            const raw = presenceMap.get(`whatsapp_presence_${agent.id}`)
            let online = false
            if (raw) {
                try {
                    const parsed = JSON.parse(raw)
                    const isFresh = parsed.lastSeen ? (now - new Date(parsed.lastSeen).getTime() <= TTL) : true
                    online = Boolean(parsed.online && isFresh)
                } catch {}
            }
            return {
                ...agent,
                online,
            }
        })

        return {
            success: true,
            detectedAgentId,
            agents: agentsWithStatus,
        }
    } catch (err: any) {
        return {
            success: false,
            detectedAgentId: null,
            agents: [
                { id: 'amine', name: 'Amine', email: '', phone: '', enabled: true, priority: 1, online: false },
                { id: 'reda', name: 'Reda', email: '', phone: '', enabled: true, priority: 2, online: false },
            ],
        }
    }
}

export async function setWhatsAppAvailability(agentId: string, online: boolean) {
    try {
        const isAuth = await isAuthenticated()
        if (!isAuth) {
            return { success: false, error: 'Accès administrateur requis' }
        }

        const now = new Date().toISOString()
        const key = `whatsapp_presence_${agentId}`

        await prisma.siteSettings.upsert({
            where: { key },
            update: { value: JSON.stringify({ online, lastSeen: now }), category: 'whatsapp_presence' },
            create: {
                key,
                value: JSON.stringify({ online, lastSeen: now }),
                category: 'whatsapp_presence',
                description: `Disponibilité WhatsApp agent ${agentId}`,
            },
        })

        const agents = await getWhatsAppAgents()
        const agent = agents.find(a => a.id === agentId)
        const agentName = agent?.name || agentId
        const agentPhone = agent?.phone

        const statusIcon = online ? '🟢' : '⚪'
        const statusText = online ? 'EN LIGNE' : 'HORS LIGNE'
        const timeStr = new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Casablanca',
        })

        const phoneLine = online && agentPhone ? `\n📱 <b>Numéro actif :</b> +${agentPhone}` : ''

        const telegramText = `${statusIcon} <b>Disponibilité WhatsApp Modifiée</b>\n\n` +
            `👤 <b>Agent :</b> ${agentName}\n` +
            `📶 <b>Statut :</b> <b>${statusText}</b>${phoneLine}\n` +
            `🕒 <b>Heure :</b> ${timeStr}`

        try {
            const { sendTelegramMessage } = await import('@/lib/telegram')
            await sendTelegramMessage(telegramText)
        } catch (tgErr) {
            console.error('Erreur notification Telegram disponibilité:', tgErr)
        }

        try {
            revalidatePath('/', 'layout')
            revalidatePath('/[locale]', 'layout')
            revalidatePath('/fr')
            revalidatePath('/ar')
            revalidatePath('/en')
        } catch {}

        return { success: true, agentId, online, agentName }
    } catch (error: any) {
        return { success: false, error: error?.message || 'Erreur lors de la mise à jour' }
    }
}

export async function heartbeatWhatsAppAvailability(agentId: string) {
    try {
        const key = `whatsapp_presence_${agentId}`
        const setting = await prisma.siteSettings.findUnique({ where: { key } })
        if (!setting?.value) return { success: true, online: false }

        const presence = JSON.parse(setting.value) as { online?: boolean }
        if (!presence.online) return { success: true, online: false }

        await prisma.siteSettings.update({
            where: { key },
            data: { value: JSON.stringify({ ...presence, lastSeen: new Date().toISOString() }) },
        })
        return { success: true, online: true }
    } catch {
        return { success: false }
    }
}

export async function getActiveWhatsAppAgentAction() {
    try {
        const active = await resolveActiveWhatsAppAgent()
        if (active) {
            return { phone: active.phone, agentName: active.name }
        }
        const defaultSetting = await prisma.siteSettings.findUnique({ where: { key: 'contact_whatsapp' } })
        return { phone: defaultSetting?.value || '212702220575', agentName: null }
    } catch {
        return { phone: '212702220575', agentName: null }
    }
}
