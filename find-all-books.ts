import { JumiaAPI } from './src/lib/jumia-api'

async function findBooksCategories() {
  const api = await JumiaAPI.getInstance();
  
  const totalPages = 555;
  const concurrency = 50;
  
  let allMatches = [];

  for (let i = 1; i <= totalPages; i += concurrency) {
      const promises = [];
      for (let j = 0; j < concurrency && (i + j) <= totalPages; j++) {
          promises.push(api.getCategories(i + j).then(res => {
              const cats = res.data || res;
              if (Array.isArray(cats)) {
                  const match = cats.filter(c => c.completePath?.includes('Books, Movies and Music'));
                  if (match.length > 0) {
                      allMatches.push(...match);
                  }
              }
          }).catch(e => {}));
      }
      await Promise.all(promises);
  }
  
  console.log("ALL SUB-CATEGORIES OF Books, Movies and Music:");
  console.log(allMatches.map(c => c.code + ' : ' + c.name + ' (' + c.completePath + ')').join('\n'));
}

findBooksCategories().catch(console.error);
