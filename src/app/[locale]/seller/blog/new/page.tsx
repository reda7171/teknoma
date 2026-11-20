import { getCategoryTree } from '@/lib/actions/category-tree'
import NewSellerPostForm from './NewSellerPostForm'

export default async function NewSellerPostPage() {
    const categoryTree = await getCategoryTree()
    return <NewSellerPostForm categoryTree={categoryTree} />
}
