const https = require('https');

https.get('https://riwaya.store/ar/books/503e0a27-62b1-4076-823e-da35bacb1a43', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const matches = data.match(/<script type="application\/ld\+json"(.*?)>(.*?)<\/script>/gs);
        if (matches) {
            matches.forEach((match, i) => {
                console.log(`\n\n--- MATCH ${i} ---`);
                const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
                try {
                    const parsed = JSON.parse(jsonContent);
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log("INVALID JSON:", jsonContent);
                }
            });
        } else {
            console.log("No JSON-LD found");
        }
    });
}).on('error', (e) => {
    console.error(e);
});
