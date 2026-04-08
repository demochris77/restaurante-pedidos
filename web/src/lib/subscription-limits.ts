import prisma from '@/lib/prisma'

export async function checkMenuItemLimit(organizationId: string): Promise<boolean> {
    // Fetch organization subscription details
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            subscriptionPlan: true,
            maxMenuItems: true
        }
    })

    if (!organization) return false

    // If maxMenuItems is null, it's unlimited
    if (organization.maxMenuItems === null || organization.maxMenuItems === undefined) {
        return true
    }

    // Count active menu items
    const activeMenuItems = await prisma.menuItem.count({
        where: {
            organizationId,
            available: true
        }
    })

    return activeMenuItems < organization.maxMenuItems
}

export async function checkUserLimit(organizationId: string): Promise<boolean> {
    // Fetch organization subscription details
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            maxUsers: true
        }
    })

    if (!organization) return false

    // If maxUsers is null, it's unlimited
    if (organization.maxUsers === null || organization.maxUsers === undefined) {
        return true
    }

    // Count current users (excluding admin)
    const currentUsers = await prisma.user.count({
        where: {
            organizationId,
            role: { not: 'admin' }
        }
    })

    return currentUsers < organization.maxUsers
}

export async function checkTableLimit(organizationId: string): Promise<boolean> {
    // Fetch organization subscription details
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            maxTables: true
        }
    })

    if (!organization) return false

    // If maxTables is null, it's unlimited
    if (organization.maxTables === null || organization.maxTables === undefined) {
        return true
    }

    // Count current tables
    const currentTables = await prisma.table.count({
        where: {
            organizationId
        }
    })

    return currentTables < organization.maxTables
}

export async function getMenuItemLimit(organizationId: string) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { maxMenuItems: true }
    })
    return organization?.maxMenuItems ?? null
}

export async function getOrganizationWithUsage(organizationId: string) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
            _count: {
                select: {
                    menuItems: { where: { available: true } },
                    tables: true,
                    users: { where: { role: { not: 'admin' } } }
                }
            }
        }
    })

    if (!organization) return null

    const isTablesUnlimited = organization.maxTables === null || organization.maxTables === undefined
    const tablesCount = organization._count.tables

    const isUsersUnlimited = organization.maxUsers === null || organization.maxUsers === undefined
    const usersCount = organization._count.users

    return {
        ...organization,
        usage: {
            menuItems: organization._count.menuItems,
            tables: {
                current: tablesCount,
                max: organization.maxTables ?? 0,
                percentage: isTablesUnlimited ? 0 : (tablesCount / (organization.maxTables || 1)) * 100,
                canAdd: isTablesUnlimited || tablesCount < (organization.maxTables || 0),
                isUnlimited: isTablesUnlimited
            },
            users: {
                current: usersCount,
                max: organization.maxUsers ?? 0,
                percentage: isUsersUnlimited ? 0 : (usersCount / (organization.maxUsers || 1)) * 100,
                canAdd: isUsersUnlimited || usersCount < (organization.maxUsers || 0),
                isUnlimited: isUsersUnlimited
            }
        }
    }
}

/**
 * Checks if the organization's subscription is currently active or within trial.
 * Returns true if the account is allowed to operate.
 */
export async function isSubscriptionActive(organizationId: string): Promise<boolean> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
            subscription: true
        }
    })

    if (!org) return false

    // Explicitly blocked by superadmin
    if (org.subscriptionStatus === 'blocked') return false

    // If in trial, check if it has expired
    if (org.subscriptionStatus === 'trial') {
        if (!org.trialEndsAt) return true // Should have a date, but allow if missing for safety
        const now = new Date()
        return new Date(org.trialEndsAt) >= now
    }

    // If it's a paid plan, check the subscription period
    if (org.subscription) {
        const now = new Date()
        const periodEnd = new Date(org.subscription.currentPeriodEnd)
        
        // Define a grace period (e.g., 5 days) where they can still use the app
        const gracePeriodDays = 5
        const gracePeriodEnd = new Date(periodEnd.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)

        // Block if now is past the grace period
        if (now > gracePeriodEnd) {
            return false
        }
    }

    // Active or within grace period
    return true
}

export async function getMenuItemCount(organizationId: string) {
    return await prisma.menuItem.count({
        where: { organizationId }
    })
}
