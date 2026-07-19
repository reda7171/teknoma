const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchBio(authorName) {
    const headers = {
        'User-Agent': 'RiwayaStore/1.0 (admin@riwaya.store) NodeFetch'
    };
    try {
        let res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`, { headers });
        if (!res.ok) {
            res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`, { headers });
        }
        if (!res.ok) {
            res = await fetch(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`, { headers });
        }
        // capitalize words hack for wikipedia (e.g. "victor hugo" -> "Victor_Hugo")
        if (!res.ok) {
            const capAuthor = authorName.replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, '_');
            res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capAuthor)}`, { headers });
        }
        if (!res.ok) {
            const capAuthor = authorName.replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, '_');
            res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capAuthor)}`, { headers });
        }
        
        if (res.ok) {
            const data = await res.json();
            return {
                bio: data.extract,
                image: data.thumbnail?.source || null
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function main() {
    try {
        console.log('Fetching unique authors from books...');
        const books = await prisma.book.findMany({ select: { author: true }});
        const uniqueAuthors = [...new Set(books.map(b => b.author))].filter(Boolean);
        
        console.log(`Found ${uniqueAuthors.length} unique authors.`);
        
        let updated = 0;
        let created = 0;
        
        for (const author of uniqueAuthors) {
            if (author.toLowerCase() === 'auteur inconnu') continue;
            
            const profile = await prisma.authorProfile.findUnique({ where: { name: author } });
            if (profile && profile.bio && profile.bio.trim() !== '') {
                continue;
            }
            
            console.log(`Fetching info for: ${author}`);
            const info = await fetchBio(author);
            
            if (info && info.bio) {
                try {
                    await prisma.authorProfile.upsert({
                        where: { name: author },
                        update: {
                            bio: info.bio,
                            image: profile?.image || info.image
                        },
                        create: {
                            name: author,
                            bio: info.bio,
                            image: info.image
                        }
                    });
                    if (profile) updated++;
                    else created++;
                    console.log(` -> Success! Added bio for ${author}`);
                } catch (e) {
                    console.error(` -> Error saving to DB for ${author}:`, e.message);
                }
            } else {
                console.log(` -> Not found on Wikipedia for ${author}`);
            }
            
            // Wait a full second to avoid Wikipedia rate limits
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`Done! Created ${created} profiles and updated ${updated} profiles.`);
    } catch (e) {
        console.error('Main error:', e);
    }
}

main().finally(() => prisma.$disconnect());
