import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const data = await jumia.getFeed("7508c373-72ec-4fc9-8bc3-ca82ad7048e0");
    console.log("Feed status:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
