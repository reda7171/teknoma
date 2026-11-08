'use server'

import * as internal from '@/lib/server/whatsapp-gateway'
import { requireRole } from '@/lib/require-role'

export type { WhatsAppGatewayStatusResponse, SendWhatsAppOptions, WhatsAppLogItem, WhatsAppLogsResponse, WahaSessionItem, WahaStatusType, WahaStatusPayload, WahaChannel, WahaChatSummary, WahaChatMessage, WahaContact, WahaLidMapping, WahaApiParameter, WahaApiOperation, WahaApiExplorerResponse } from '@/lib/server/whatsapp-gateway'

export async function getWhatsAppGatewayStatus(...args: Parameters<typeof internal.getWhatsAppGatewayStatus>) {
    await requireRole()
    return internal.getWhatsAppGatewayStatus(...args)
}

export async function sendWhatsAppMessageDirect(...args: Parameters<typeof internal.sendWhatsAppMessageDirect>) {
    await requireRole()
    return internal.sendWhatsAppMessageDirect(...args)
}

export async function sendWhatsAppMessageViaGateway(...args: Parameters<typeof internal.sendWhatsAppMessageViaGateway>) {
    await requireRole()
    return internal.sendWhatsAppMessageViaGateway(...args)
}

export async function restartWhatsAppSession(...args: Parameters<typeof internal.restartWhatsAppSession>) {
    await requireRole()
    return internal.restartWhatsAppSession(...args)
}

export async function disconnectWhatsAppGateway(...args: Parameters<typeof internal.disconnectWhatsAppGateway>) {
    await requireRole()
    return internal.disconnectWhatsAppGateway(...args)
}

export async function getWhatsAppGatewaySettings(...args: Parameters<typeof internal.getWhatsAppGatewaySettings>) {
    await requireRole()
    return internal.getWhatsAppGatewaySettings(...args)
}

export async function updateWhatsAppGatewaySetting(...args: Parameters<typeof internal.updateWhatsAppGatewaySetting>) {
    await requireRole()
    return internal.updateWhatsAppGatewaySetting(...args)
}

export async function getWhatsAppTemplates(...args: Parameters<typeof internal.getWhatsAppTemplates>) {
    await requireRole()
    return internal.getWhatsAppTemplates(...args)
}

export async function updateWhatsAppTemplate(...args: Parameters<typeof internal.updateWhatsAppTemplate>) {
    await requireRole()
    return internal.updateWhatsAppTemplate(...args)
}

export async function getWhatsAppMessageLogs(...args: Parameters<typeof internal.getWhatsAppMessageLogs>) {
    await requireRole()
    return internal.getWhatsAppMessageLogs(...args)
}

export async function resendWhatsAppMessage(...args: Parameters<typeof internal.resendWhatsAppMessage>) {
    await requireRole()
    return internal.resendWhatsAppMessage(...args)
}

export async function deleteWhatsAppLog(...args: Parameters<typeof internal.deleteWhatsAppLog>) {
    await requireRole()
    return internal.deleteWhatsAppLog(...args)
}

export async function clearWhatsAppLogs(...args: Parameters<typeof internal.clearWhatsAppLogs>) {
    await requireRole()
    return internal.clearWhatsAppLogs(...args)
}

export async function getWahaSessions(...args: Parameters<typeof internal.getWahaSessions>) {
    await requireRole()
    return internal.getWahaSessions(...args)
}

export async function createWahaSession(...args: Parameters<typeof internal.createWahaSession>) {
    await requireRole()
    return internal.createWahaSession(...args)
}

export async function startWahaSession(...args: Parameters<typeof internal.startWahaSession>) {
    await requireRole()
    return internal.startWahaSession(...args)
}

export async function stopWahaSession(...args: Parameters<typeof internal.stopWahaSession>) {
    await requireRole()
    return internal.stopWahaSession(...args)
}

export async function restartWahaSessionByName(...args: Parameters<typeof internal.restartWahaSessionByName>) {
    await requireRole()
    return internal.restartWahaSessionByName(...args)
}

export async function deleteWahaSession(...args: Parameters<typeof internal.deleteWahaSession>) {
    await requireRole()
    return internal.deleteWahaSession(...args)
}

export async function getWahaSessionQrCode(...args: Parameters<typeof internal.getWahaSessionQrCode>) {
    await requireRole()
    return internal.getWahaSessionQrCode(...args)
}

export async function getWahaSessionQrFormatted(...args: Parameters<typeof internal.getWahaSessionQrFormatted>) {
    await requireRole()
    return internal.getWahaSessionQrFormatted(...args)
}

export async function requestWahaPairingCode(...args: Parameters<typeof internal.requestWahaPairingCode>) {
    await requireRole()
    return internal.requestWahaPairingCode(...args)
}

export async function getWahaSessionScreenshot(...args: Parameters<typeof internal.getWahaSessionScreenshot>) {
    await requireRole()
    return internal.getWahaSessionScreenshot(...args)
}

export async function getWahaPasskeyChallenge(...args: Parameters<typeof internal.getWahaPasskeyChallenge>) {
    await requireRole()
    return internal.getWahaPasskeyChallenge(...args)
}

export async function submitWahaPasskey(...args: Parameters<typeof internal.submitWahaPasskey>) {
    await requireRole()
    return internal.submitWahaPasskey(...args)
}

export async function getWahaPasskeyConfirmation(...args: Parameters<typeof internal.getWahaPasskeyConfirmation>) {
    await requireRole()
    return internal.getWahaPasskeyConfirmation(...args)
}

export async function confirmWahaPasskey(...args: Parameters<typeof internal.confirmWahaPasskey>) {
    await requireRole()
    return internal.confirmWahaPasskey(...args)
}

export async function sendWahaStatus(...args: Parameters<typeof internal.sendWahaStatus>) {
    await requireRole()
    return internal.sendWahaStatus(...args)
}

export async function getWahaChannels(...args: Parameters<typeof internal.getWahaChannels>) {
    await requireRole()
    return internal.getWahaChannels(...args)
}

export async function sendWahaChannelMessage(...args: Parameters<typeof internal.sendWahaChannelMessage>) {
    await requireRole()
    return internal.sendWahaChannelMessage(...args)
}

export async function getWahaChats(...args: Parameters<typeof internal.getWahaChats>) {
    await requireRole()
    return internal.getWahaChats(...args)
}

export async function getWahaChatsOverviewByIds(...args: Parameters<typeof internal.getWahaChatsOverviewByIds>) {
    await requireRole()
    return internal.getWahaChatsOverviewByIds(...args)
}

export async function getWahaChatPicture(...args: Parameters<typeof internal.getWahaChatPicture>) {
    await requireRole()
    return internal.getWahaChatPicture(...args)
}

export async function getWahaChatMessages(...args: Parameters<typeof internal.getWahaChatMessages>) {
    await requireRole()
    return internal.getWahaChatMessages(...args)
}

export async function getWahaChatMessage(...args: Parameters<typeof internal.getWahaChatMessage>) {
    await requireRole()
    return internal.getWahaChatMessage(...args)
}

export async function runWahaChatAction(...args: Parameters<typeof internal.runWahaChatAction>) {
    await requireRole()
    return internal.runWahaChatAction(...args)
}

export async function runWahaMessageAction(...args: Parameters<typeof internal.runWahaMessageAction>) {
    await requireRole()
    return internal.runWahaMessageAction(...args)
}

export async function getWahaContacts(...args: Parameters<typeof internal.getWahaContacts>) {
    await requireRole()
    return internal.getWahaContacts(...args)
}

export async function getWahaContact(...args: Parameters<typeof internal.getWahaContact>) {
    await requireRole()
    return internal.getWahaContact(...args)
}

export async function inspectWahaContact(...args: Parameters<typeof internal.inspectWahaContact>) {
    await requireRole()
    return internal.inspectWahaContact(...args)
}

export async function updateWahaContact(...args: Parameters<typeof internal.updateWahaContact>) {
    await requireRole()
    return internal.updateWahaContact(...args)
}

export async function setWahaContactBlocked(...args: Parameters<typeof internal.setWahaContactBlocked>) {
    await requireRole()
    return internal.setWahaContactBlocked(...args)
}

export async function getWahaLids(...args: Parameters<typeof internal.getWahaLids>) {
    await requireRole()
    return internal.getWahaLids(...args)
}

export async function getWahaLidsCount(...args: Parameters<typeof internal.getWahaLidsCount>) {
    await requireRole()
    return internal.getWahaLidsCount(...args)
}

export async function resolveWahaLid(...args: Parameters<typeof internal.resolveWahaLid>) {
    await requireRole()
    return internal.resolveWahaLid(...args)
}

export async function getWahaOpenApiCatalog(...args: Parameters<typeof internal.getWahaOpenApiCatalog>) {
    await requireRole()
    return internal.getWahaOpenApiCatalog(...args)
}

export async function executeWahaApiOperation(...args: Parameters<typeof internal.executeWahaApiOperation>) {
    await requireRole()
    return internal.executeWahaApiOperation(...args)
}
