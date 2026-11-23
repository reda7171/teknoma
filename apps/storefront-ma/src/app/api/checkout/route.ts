export async function POST(request: Request) {
  const backend = process.env.TEKNO_BACKEND_URL
  if (!backend) return Response.json({ success: false, error: 'Checkout non configuré.' }, { status: 503 })
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
  try {
    const response = await fetch(`${backend.replace(/\/$/, '')}/api/storefront/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}) },
      body: await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(35000),
    })
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ success: false, error: 'Service de commande temporairement indisponible.' }, { status: 503 })
  }
}
