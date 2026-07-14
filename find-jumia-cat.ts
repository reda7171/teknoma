import { JumiaAPI } from './src/lib/jumia-api'

async function findBestsellingBooks() {
  const api = await JumiaAPI.getInstance();
  
  // To avoid fetching all 555 pages, let's run them in batches of 10
  for (let page = 1; page <= 555; page++) {
      const res = await api.getCategories(page);
      const cats = res.data || res;
      
      if (Array.isArray(cats)) {
          const match = cats.find(c => c.name === 'Bestselling Books' || c.completePath?.includes('Bestselling Books') || c.name === 'Books & Magazines');
          if (match) {
              console.log("FOUND!");
              console.log(JSON.stringify(match, null, 2));
          }
      }
      if (page % 20 === 0) console.log(`Searched ${page} pages...`);
  }
}

findBestsellingBooks().catch(console.error);
