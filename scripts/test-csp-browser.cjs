// Run against a local production build: node scripts/test-csp-browser.cjs http://localhost:3104
const assert = require('node:assert/strict');

(async () => {
    const origin = process.argv[2] || 'http://localhost:3104';
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local test server');
    const puppeteer = (await import('puppeteer')).default;
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        // These checks never submit an order, credentials or analytics.
        await page.setRequestInterception(true);
        page.on('request', async request => {
            try {
                if (request.method() !== 'GET' || new URL(request.url()).origin !== new URL(origin).origin) return await request.abort();
                if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                    const upstream = await fetch(request.url(), { redirect: 'manual' });
                    const headers = Object.fromEntries(upstream.headers);
                    delete headers['content-encoding']; delete headers['content-length']; delete headers['transfer-encoding'];
                    const nonce = headers['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];
                    let body = await upstream.text();
                    if (upstream.status === 200 && nonce) {
                        // Inject a simulated untrusted HTML payload into this local test response.
                        body = body.replace('</head>', `<script id="untrusted-probe">window.__unauthorizedCspProbe=true</script><script nonce="${nonce}">window.__authorizedCspProbe=true</script></head>`);
                    }
                    return await request.respond({ status: upstream.status, headers, body });
                }
                await request.continue();
            } catch (error) { console.error(error.message); await request.abort(); }
        });
        await page.evaluateOnNewDocument(() => {
            window.__cspViolations = [];
            document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
        });
        let previousNonce;
        for (const route of ['/fr/admin/login', '/fr/books', '/ar', '/en']) {
            const response = await page.goto(origin + route, { waitUntil: 'networkidle0', timeout: 90000 });
            assert.equal(response.status(), 200, route);
            const policy = response.headers()['content-security-policy'];
            const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
            assert.ok(nonce, route + ' nonce missing');
            assert.notEqual(nonce, previousNonce); previousNonce = nonce;
            assert.equal(response.headers()['referrer-policy'], 'strict-origin-when-cross-origin');
            const document = await page.evaluate(() => ({
                executableScripts: [...window.document.scripts].filter(script => script.id !== 'untrusted-probe' && (!script.type || script.type === 'text/javascript' || script.type === 'module')).map(script => ({ nonce: script.nonce, src: script.src })),
                runtimeRan: Array.isArray(window.self.__next_f),
                text: window.document.body.innerText.length,
                violations: window.__cspViolations,
            }));
            assert.ok(document.runtimeRan, route + ' Next inline bootstrap blocked');
            assert.ok(document.text > 100, route + ' content missing');
            assert.ok(document.executableScripts.length > 0);
            assert.ok(document.executableScripts.every(script => script.src || script.nonce === nonce), route + ' executable script without nonce: ' + JSON.stringify(document.executableScripts.filter(script => script.nonce !== nonce)));
            assert.equal(document.violations.filter(v => v.directive.startsWith('script-src') && v.blocked !== 'inline').length, 0, route + ' legitimate script blocked');
            const probes = await page.evaluate(() => ({ unauthorized: !!window.__unauthorizedCspProbe, authorized: !!window.__authorizedCspProbe }));
            assert.equal(probes.unauthorized, false, route + ' untrusted inline script executed');
            assert.equal(probes.authorized, true, route + ' trusted inline script blocked');
            const beforeInteraction = document.violations.filter(v => v.directive.startsWith('script-src') && v.blocked === 'inline').length;
            await page.keyboard.press('Tab');
            await page.waitForFunction(() => !!window.document.getElementById('gtm-script'), { timeout: 15000 });
            const deferred = await page.evaluate(() => ({
                nonce: window.document.getElementById('gtm-script').nonce,
                blockedInline: window.__cspViolations.filter(v => v.directive.startsWith('script-src') && v.blocked === 'inline').length,
            }));
            assert.equal(deferred.nonce, nonce, route + ' deferred script nonce missing');
            assert.equal(deferred.blockedInline, beforeInteraction, route + ' legitimate deferred script blocked');
            console.log('PASS ' + route + ': runtime, per-document nonce, unauthorized script blocked');
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
