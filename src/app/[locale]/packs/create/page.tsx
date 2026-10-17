import { PacksContent, generateMetadata } from '../page'

export { generateMetadata }

export const dynamic = 'force-dynamic'

export default function CreatePackPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    return <PacksContent params={params} openCustomBuilder />
}
