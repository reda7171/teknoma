import { JumiaAPI } from './src/lib/jumia-api';

async function checkFeeds() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.request('/feeds');
    console.log(JSON.stringify(res, null, 2));
}

checkFeeds().catch(console.error);
