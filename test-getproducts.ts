import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    
    // Choose a valid book SKU. Let's find one from the DB or just use RIW-MRUKYUO2-00CK
    const data = await jumia.getProducts({ sellerSku: "RIW-MRUKYUO2-00CK" });
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
