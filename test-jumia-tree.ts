import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
  const api = await JumiaAPI.getInstance()
  const res = await api.request('/catalog/category-tree')
  console.log(JSON.stringify(res).substring(0, 500))
}

main().catch(console.error)
