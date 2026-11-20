import { getCommunityUser } from '@/lib/actions/community-auth'
import { getSettingsByCategory } from '@/lib/actions/site-settings'
import UserDropdown from './UserDropdown'

export default async function UserDropdownWrapper() {
    const [user, featureSettings] = await Promise.all([
        getCommunityUser(),
        getSettingsByCategory('features')
    ])

    const features = {
        readingList: false,
        exchange: false,
    }

    return <UserDropdown user={user} features={features} />
}
