async function testWebhook() {
    console.log('Testing n8n webhook...')
    try {
        const res = await fetch('http://167.86.108.246:5678/webhook/riwaya-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        })
        console.log('Status:', res.status)
        const text = await res.text()
        console.log('Response:', text)
    } catch (e: any) {
        console.error('Fetch failed:', e.message)
    }
}
testWebhook()
