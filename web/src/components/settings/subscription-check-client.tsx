'use client'

import { usePathname } from 'next/navigation'
import { SubscriptionBlocked } from './subscription-blocked'

interface SubscriptionCheckClientProps {
    slug: string
    isActive: boolean
    isAdmin: boolean
}

export function SubscriptionCheckClient({ slug, isActive, isAdmin }: SubscriptionCheckClientProps) {
    const pathname = usePathname()
    
    // Do not show the blocking overlay if:
    // 1. The account is active
    // 2. The user is already on the subscription settings page (to allow payment)
    const isSubscriptionPage = pathname.endsWith('/settings/subscription')
    
    if (isActive || isSubscriptionPage) {
        return null
    }

    return <SubscriptionBlocked slug={slug} isAdmin={isAdmin} />
}
