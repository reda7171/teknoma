import { JumiaAPI } from './src/lib/jumia-api';

async function checkFeed() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.getFeed('1aa9ba7f-1b85-4032-ae2a-d8f8bbda9d16');
    console.log(JSON.stringify(res, null, 2));
}

checkFeed().catch(console.error);
