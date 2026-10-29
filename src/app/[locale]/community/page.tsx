import { redirect } from '@/i18n/routing'

export default async function CustomerAccount({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect({ href: '/community/profile/edit', locale })
}
