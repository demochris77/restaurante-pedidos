import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function promoteToSuperAdmin(email: string) {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'superadmin' }
        })
        console.log(`User ${user.email} has been promoted to superadmin.`)
    } catch (error) {
        console.error('Error promoting user:', error)
    } finally {
        await prisma.$disconnect()
    }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
    console.error('Please provide an email: npx ts-node scripts/promote-superadmin.ts <email>')
    process.exit(1)
}

promoteToSuperAdmin(email)
