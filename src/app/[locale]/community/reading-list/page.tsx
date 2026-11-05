import { getReadingList } from '@/lib/actions/reading-list'
import { getTranslations } from 'next-intl/server'
import ReadingListBoard from '@/components/ReadingListBoard'
import AddManualBookReadingList from '@/components/AddManualBookReadingList'
import ReadingListStats from '@/components/ReadingListStats'
import Header from '@/components/HeaderWithUser'
import { getCommunityUser, getTopReaders } from '@/lib/actions/community-auth'
import Footer from '@/components/Footer'
import ReadingLeaderboard from '@/components/community/ReadingLeaderboard'
import { isFeatureEnabled } from '@/lib/actions/site-settings'
import { notFound } from 'next/navigation'

export default async function ReadingListPage() {
    // Guard: vérifier si le Suivi de Lecture est activé
    const enabled = await isFeatureEnabled('feature_reading_list')
    if (!enabled) notFound()

    const t = await getTranslations('Community')
    const [readingList, user, topReaders] = await Promise.all([
        getReadingList(),
        getCommunityUser(),
        getTopReaders(10)
    ])

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 pb-32 md:pb-8">
                {/* 1. Ma Liste de Lecture */}
                <h1 className="text-2xl md:text-3xl font-black mb-2 text-black">{t('ReadingList.Title')}</h1>
                <p className="text-sm md:text-base text-gray-500 mb-6 md:mb-8 font-medium">{t('ReadingList.Subtitle')}</p>

                <ReadingListStats items={readingList} />

                <ReadingListBoard initialItems={readingList} user={user}>
                    <AddManualBookReadingList />
                </ReadingListBoard>

                {/* 2. Classement des Lecteurs (en dessous) */}
                <div className="mt-16 pt-12 border-t border-gray-200">
                    <ReadingLeaderboard topReaders={topReaders} />
                </div>
            </div>
            <Footer />
        </div>
    )
}
