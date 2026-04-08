import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const plans = await (prisma as any).planDefinition.findMany({
            orderBy: { price: 'asc' }
        })
        return NextResponse.json(plans)
    } catch (error) {
        console.error('Error fetching public plans:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
