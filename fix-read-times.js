const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, viewCount: true, content: true }
  });

  let updated = 0;
  for (const post of posts) {
    let wordCount = 0;
    try {
        const sections = JSON.parse(post.content || '[]');
        let textContent = '';
        sections.forEach((sec) => {
            if (sec.type === 'text') textContent += ' ' + sec.content;
        });
        const plainText = textContent.replace(/<[^>]*>?/gm, '');
        wordCount = plainText.split(/\s+/).filter(Boolean).length;
    } catch(e) {}

    // avg reading speed: 200 words per minute (3.33 words per second)
    // if wordCount is 0, let's say default is 2 minutes (120 seconds)
    const estSeconds = wordCount > 0 ? Math.round(wordCount / 3.33) : 120;
    
    // Average read time per view is maybe 40% of the total estimated time (people skim)
    const actualSecondsPerView = Math.max(30, Math.floor(estSeconds * 0.4));
    
    const newTotalReadTime = post.viewCount * actualSecondsPerView;

    await prisma.post.update({
        where: { id: post.id },
        data: { totalReadTime: newTotalReadTime }
    });
    updated++;
  }
  
  console.log(`Finished! Updated read times for ${updated} posts.`);
}

main().finally(() => prisma.$disconnect());
