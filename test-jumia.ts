import { JumiaAPI } from './src/lib/jumia-api';
import { prisma } from './src/lib/prisma';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const prods = await jumia.getProducts({ limit: 1 });
    console.log(JSON.stringify(prods, null, 2));
}
test();
