import 'server-only'

import { prisma } from '@/lib/prisma'

export interface WhatsAppAgentConfig {
    id: string
    name: string
    email: string
    phone: string
    enabled: boolean
    priority: number
}

interface WhatsAppPresence {
    online: boolean
    lastSeen: string
    sessionStartedAt?: string
}

const PRESENCE_TTL_MS = 24 * 60 * 60 * 1000 // 24 heures de session active

export const DEFAULT_WHATSAPP_AGENTS: WhatsAppAgentConfig[] = [
    { id: 'amine', name: 'Amine', email: '', phone: '', enabled: true, priority: 1 },
    { id: 'reda', name: 'Reda', email: '', phone: '', enabled: true, priority: 2 },
]

export function parseWhatsAppAgents(value: string | null | undefined): WhatsAppAgentConfig[] {
    if (!value) return DEFAULT_WHATSAPP_AGENTS
    try {
        const agents = JSON.parse(value) as WhatsAppAgentConfig[]
        if (!Array.isArray(agents) || agents.length === 0) return DEFAULT_WHATSAPP_AGENTS
        return agents
            .filter(agent => agent && agent.id && agent.name)
            .map((agent, index) => ({
                ...agent,
                id: String(agent.id),
                name: String(agent.name).trim(),
                email: (agent.email || '').trim().toLowerCase(),
                phone: (agent.phone || '').trim(),
                enabled: agent.enabled !== false,
                priority: Number(agent.priority) || index + 1,
            }))
    } catch {
        return DEFAULT_WHATSAPP_AGENTS
    }
}

export async function getWhatsAppAgents(): Promise<WhatsAppAgentConfig[]> {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'whatsapp_agents' } })
    return parseWhatsAppAgents(setting?.value)
}

export async function resolveActiveWhatsAppAgent() {
    const agents = (await getWhatsAppAgents())
        .filter(agent => agent.enabled)
        .sort((a, b) => a.priority - b.priority)
    if (agents.length === 0) return null

    const defaultSetting = await prisma.siteSettings.findUnique({ where: { key: 'contact_whatsapp' } })
    const fallbackPhone = defaultSetting?.value || '212702220575'

    const presenceSettings = await prisma.siteSettings.findMany({
        where: { key: { in: agents.map(agent => `whatsapp_presence_${agent.id}`) } },
    })
    const presenceByKey = new Map(presenceSettings.map(setting => [setting.key, setting.value]))
    const now = Date.now()

    for (const agent of agents) {
        const rawPresence = presenceByKey.get(`whatsapp_presence_${agent.id}`)
        if (!rawPresence) continue
        try {
            const presence = JSON.parse(rawPresence) as WhatsAppPresence
            const isFresh = now - new Date(presence.lastSeen).getTime() <= PRESENCE_TTL_MS
            if (presence.online && isFresh) {
                return {
                    ...agent,
                    phone: agent.phone || fallbackPhone
                }
            }
        } catch {
            // Ignore malformed presence
        }
    }

    return null
}
