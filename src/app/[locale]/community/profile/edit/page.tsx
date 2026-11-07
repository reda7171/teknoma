import { getCommunityUser } from '@/lib/actions/community-auth'
import { redirect } from 'next/navigation'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import ProfileEditForm from '@/components/community/ProfileEditForm'
import { getReadingList } from '@/lib/actions/reading-list'
import GenerateReadingCard from '@/components/GenerateReadingCard'

export default async function ProfileEditPage() {
    const user = await getCommunityUser()

    if (!user) {
        redirect('/community/login')
    }

    const readingList = await getReadingList().catch(() => [])

    // Adapt user object for client component props (filtering sensitive data)
    const userProps = {
        fullName: user.fullName || '',
        city: user.city || '',
        address: user.address,
        neighborhood: user.neighborhood,
        email: user.email,
        image: user.image,
        bio: user.bio,
        instagram: user.instagram,
        facebook: user.facebook,
        twitter: user.twitter,
    }

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />
            <main className="flex-grow flex flex-col items-center justify-center p-4 py-12 sm:py-20 relative overflow-hidden">
                <ProfileEditForm user={userProps} />
                <div className="mt-6 max-w-xl w-full flex justify-center">
                    <GenerateReadingCard user={userProps} items={readingList} className="w-full" />
                </div>
            </main>
            <Footer />
        </div>
    )
}
