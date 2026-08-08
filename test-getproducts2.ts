import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const data = await jumia.getProducts({ sellerSku: "176F98B4" });
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
