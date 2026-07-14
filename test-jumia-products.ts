import { JumiaAPI } from './src/lib/jumia-api'

async function test() {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) {
        console.log("Jumia not enabled")
        return
    }
    const data = await jumia.getProducts({ size: 10 })
    console.log(JSON.stringify(data, null, 2))
}

test()
