// Shared by the static fallback and the per-document middleware policy.
export function contentSecurityPolicy(nonce?: string, development = false) {
    if (nonce !== undefined && !/^[A-Za-z0-9+/]{22}==$/.test(nonce)) throw new Error('Invalid CSP nonce')
    const scripts = [
        "'self'", ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : []),
        ...(development ? ["'unsafe-eval'"] : []),
        'https://www.googletagmanager.com', 'https://connect.facebook.net',
        'https://pagead2.googlesyndication.com', 'https://challenges.cloudflare.com',
        'https://unpkg.com', 'https://www.gstatic.com', 'https://apis.google.com',
        'https://accounts.google.com', 'https://maps.googleapis.com',
        'https://www.clarity.ms', 'https://*.clarity.ms',
    ]
    return [
        "default-src 'self'", `script-src ${scripts.join(' ')}`, "script-src-attr 'none'",
        "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'",
        "form-action 'self' https://payment.cmi.co.ma https://testpayment.cmi.co.ma https://www.paypal.com https://www.sandbox.paypal.com https://checkout.stripe.com https://www.facebook.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
        "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https:",
        "frame-src 'self' https://www.googletagmanager.com https://www.openstreetmap.org https://www.google.com https://maps.googleapis.com https://maps.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://challenges.cloudflare.com https://accounts.google.com https://smartlock.google.com https://www.facebook.com",
        "connect-src 'self' https: blob:" + (development ? ' ws: wss:' : ''),
        "media-src 'self' blob: https:", "worker-src 'self' blob:",
        ...(!development ? ['upgrade-insecure-requests'] : []),
    ].join('; ')
}
