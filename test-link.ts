import { checkJumiaLinkBySkuExact } from './src/lib/actions/jumia';

async function test() {
    const res = await checkJumiaLinkBySkuExact("12356789");
    console.log("Is linked?", res);
}

test().catch(console.error);
