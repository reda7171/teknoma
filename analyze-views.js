const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, viewCount: true, publishedAt: true },
    orderBy: { viewCount: 'desc' }
  });

  console.log('--- Posts by View Count ---');
  posts.forEach(p => {
    console.log(`${p.viewCount} views | Date: ${p.publishedAt ? p.publishedAt.toISOString().split('T')[0] : 'N/A'} | ${p.title}`);
  });

  // Automatically fix dates based on view counts
  // Higher views = older dates.
  console.log('\n--- Updating dates to be logical based on views ---');
  const now = new Date();
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    // max views = oldest. We'll space them out by 3-7 days based on rank.
    // Let's just create a logical curve based on views
    // If it has 5000 views, it should be at least a few months old
    // 10 views per day is a good average?
    // Let's just say age in days = viewCount / 10
    
    let daysOld = Math.floor(post.viewCount / 10);
    if (daysOld < 1) daysOld = 1;
    if (daysOld > 1000) daysOld = 1000;
    
    const logicalDate = new Date(now.getTime() - (daysOld * 24 * 60 * 60 * 1000));
    
    await prisma.post.update({
      where: { id: post.id },
      data: { publishedAt: logicalDate }
    });
    
    console.log(`Updated "${post.title.substring(0, 30)}..." to ${logicalDate.toISOString().split('T')[0]} (${daysOld} days old, ${post.viewCount} views)`);
  }
}

main().finally(() => prisma.$disconnect());
