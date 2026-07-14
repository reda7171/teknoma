import { JumiaAPI } from './src/lib/jumia-api'

async function findBestsellingBooks() {
  const api = await JumiaAPI.getInstance();
  
  const totalPages = 555;
  const concurrency = 50;
  
  for (let i = 1; i <= totalPages; i += concurrency) {
      console.log(`Fetching pages ${i} to ${i + concurrency - 1}...`);
      const promises = [];
      for (let j = 0; j < concurrency && (i + j) <= totalPages; j++) {
          promises.push(api.getCategories(i + j).then(res => {
              const cats = res.data || res;
              if (Array.isArray(cats)) {
                  const match = cats.find(c => c.name === 'Bestselling Books' || c.completePath?.includes('Bestselling Books') || c.name === 'Livres les plus vendus');
                  if (match) {
                      console.log("FOUND!");
                      console.log(JSON.stringify(match, null, 2));
                      process.exit(0);
                  }
              }
          }).catch(e => {}));
      }
      await Promise.all(promises);
  }
}

findBestsellingBooks().catch(console.error);
