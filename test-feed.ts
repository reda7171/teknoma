import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.request('/feeds/e55c2a26-0b1d-4c25-9822-29834f4a3320');
    console.log(JSON.stringify(res, null, 2));
}
test();
