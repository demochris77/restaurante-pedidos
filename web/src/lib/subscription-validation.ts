import prisma from '@/lib/prisma'
import { type PlanType, getPlanLimits } from './mercadopago-subscriptions'

/**
 * Check if organization can downgrade to a new plan
 */
export async function canDowngradeToPlan(organizationId: string, newPlan: PlanType) {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            id: true,
            _count: {
                select: { tables: true }
            }
        }
    })

    if (!org) {
        return {
            canDowngrade: false,
            reason: 'Organization not found',
            currentTables: 0,
            currentUsers: 0,
            newMaxTables: 0,
            newMaxUsers: 0
        }
    }

    // Count only non-admin users
    const currentUsers = await prisma.user.count({
        where: { 
            organizationId,
            role: { not: 'admin' }
        }
    })

    const newLimits = getPlanLimits(newPlan)
    const currentTables = org._count.tables

    const canDowngrade = currentTables <= newLimits.maxTables && currentUsers <= newLimits.maxUsers

    return {
        canDowngrade,
        reason: canDowngrade ? null : 'Current usage exceeds new plan limits',
        currentTables,
        currentUsers,
        newMaxTables: newLimits.maxTables,
        newMaxUsers: newLimits.maxUsers,
        tablesToRemove: Math.max(0, currentTables - newLimits.maxTables),
        usersToRemove: Math.max(0, currentUsers - newLimits.maxUsers)
    }
}
