import { isAuthenticated } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import FollowUpClient from './FollowUpClient'

export const metadata = {
    title: 'Relance Client | PetsUnivers Admin'
}

export default async function FollowUpPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params
    const { locale } = params

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    return <FollowUpClient locale={locale} />
}
