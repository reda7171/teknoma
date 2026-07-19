const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const countries = [
    { name: 'Maroc', weight: 45 },
    { name: 'France', weight: 25 },
    { name: 'Algérie', weight: 15 },
    { name: 'Canada', weight: 10 },
    { name: 'Belgique', weight: 5 }
  ];

  console.log('Generating mock page views for blog countries...');
  
  const pageViews = [];
  const now = new Date();
  
  // Create 500 mock views
  for (let i = 0; i < 500; i++) {
    const r = Math.random() * 100;
    let selectedCountry = 'Maroc';
    let sum = 0;
    for (const c of countries) {
      sum += c.weight;
      if (r <= sum) {
        selectedCountry = c.name;
        break;
      }
    }
    
    // random date within the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const viewDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    pageViews.push({
      url: '/fr/blog/mock-article-url',
      country: selectedCountry,
      createdAt: viewDate
    });
  }

  await prisma.pageView.createMany({
    data: pageViews
  });

  console.log(`Successfully generated 500 mock page views for blog.`);
}

main().finally(() => prisma.$disconnect());
