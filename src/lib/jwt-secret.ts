import 'server-only'

const configuredSecret = process.env.JWT_SECRET

if (!configuredSecret || configuredSecret.length < 32) {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères')
}

export const JWT_SECRET = configuredSecret
