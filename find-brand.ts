import { JumiaAPI } from './src/lib/jumia-api'

async function findGenericBrand() {
  const api = await JumiaAPI.getInstance();

  for (let i = 1; i <= 200; i++) {
      const res = await api.getBrands(i);
      const list = res.data ? res.data.brands : res.brands;
      
      if (Array.isArray(list)) {
          const match = list.find((b:any) => b.name && b.name.toLowerCase() === 'generic');
          if (match) {
              console.log("FOUND GENERIC:", match);
              return;
          }
      } else {
        console.log("Not an array on page", i);
      }
      if (i % 20 === 0) console.log(`Searched ${i} pages...`);
  }
}

findGenericBrand().catch(console.error);
