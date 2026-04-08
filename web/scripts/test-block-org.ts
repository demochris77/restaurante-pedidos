import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const slug = 'hamelin-foods'
  
  // Set trial and backdate it by 2 days
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() - 2)
  
  const org = await prisma.organization.update({
    where: { slug },
    data: {
      subscriptionStatus: 'trial',
      trialEndsAt: trialEndsAt,
    },
  })
  
  console.log(`Organization ${org.name} updated.`)
  console.log(`Status: ${org.subscriptionStatus}`)
  console.log(`Trial Ends At: ${org.trialEndsAt}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
