import { MercadoPagoConfig, PreApproval } from 'mercadopago'

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

const preapproval = new PreApproval(client)

// Plan pricing in ARS
export const PLAN_PRICING = {
    basic: 15000,
    professional: 35000,
    enterprise: 75000
} as const

export type PlanType = keyof typeof PLAN_PRICING

/**
 * Create a Mercado Pago subscription (preapproval)
 */
export async function createMPSubscription(params: {
    plan: PlanType
    organizationId: string
    organizationName: string
    userEmail: string
    trialDays?: number
}) {
    const { plan, organizationId, organizationName, userEmail, trialDays = 7 } = params

    const amount = PLAN_PRICING[plan]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const backUrl = `${baseUrl}/${organizationId}/settings/subscription`

    try {
        const response = await preapproval.create({
            body: {
                reason: `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} - ${organizationName}`,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                    free_trial: trialDays > 0 ? {
                        frequency: trialDays,
                        frequency_type: 'days'
                    } : undefined
                } as any,
                back_url: backUrl,
                payer_email: userEmail,
                external_reference: organizationId,
                status: 'pending'
            }
        })

        return {
            success: true,
            preapprovalId: response.id,
            initPoint: response.init_point,
            data: response
        }
    } catch (error) {
        console.error('Error creating MP subscription:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Cancel a Mercado Pago subscription
 */
export async function cancelMPSubscription(preapprovalId: string) {
    try {
        await preapproval.update({
            id: preapprovalId,
            body: {
                status: 'cancelled'
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Error cancelling MP subscription:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get subscription status from Mercado Pago
 */
export async function getMPSubscriptionStatus(preapprovalId: string) {
    try {
        const response = await preapproval.get({ id: preapprovalId })

        return {
            success: true,
            status: response.status,
            data: response
        }
    } catch (error) {
        console.error('Error getting MP subscription status:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get plan limits
 */
export function getPlanLimits(plan: PlanType) {
    const limits = {
        basic: { maxTables: 5, maxUsers: 2 },
        professional: { maxTables: 15, maxUsers: 5 },
        enterprise: { maxTables: 999, maxUsers: 999 }
    }

    return limits[plan]
}

/**
 * Calculate next billing date (1 month from now)
 */
export function getNextBillingDate(fromDate: Date = new Date()): Date {
    const next = new Date(fromDate)
    next.setMonth(next.getMonth() + 1)
    return next
}

/**
 * Calculate trial end date
 */
export function getTrialEndDate(days: number = 7): Date {
    const end = new Date()
    end.setDate(end.getDate() + days)
    return end
}

/**
 * Calculate grace period end date
 */
export function getGracePeriodEnd(days: number = 7): Date {
    const end = new Date()
    end.setDate(end.getDate() + days)
    return end
}
