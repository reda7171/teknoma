import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    let hasNext = true;
    let nextToken: string | undefined = undefined;
    let total = 0;
    while(hasNext) {
        const data = await jumia.getProducts({ size: 100, token: nextToken });
        if(data && data.products) {
            total += data.products.length;
            data.products.forEach(p => {
                if(p.variations) {
                    p.variations.forEach(v => {
                        if(v.sellerSku.includes('176F98B4')) {
                            console.log("FOUND 176F98B4 in:", v.sellerSku, p.id, v.id);
                        }
                    })
                }
            })
        }
        if(data?.isLastPage === false && data?.nextToken) {
            nextToken = data.nextToken;
        } else {
            hasNext = false;
        }
    }
    console.log("Total products on Jumia:", total);
}

main().catch(console.error);
