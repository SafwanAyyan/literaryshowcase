import { DatabaseService } from '../lib/database-service'
import { literaryData } from '../lib/data'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...')

    // Create admin user
    const adminEmail = 'admin@literaryshowcase.com'
    const adminPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin'
        }
      })
      console.log('✅ Admin user created')
      console.log(`   Email: ${adminEmail}`)
      console.log(`   Password: ${adminPassword}`)
    } else {
      console.log('✅ Admin user already exists')
    }

    // Seed content data
    await DatabaseService.seedInitialData(literaryData)
    console.log(`✅ Seeded ${literaryData.length} content items`)

    // Display statistics
    const stats = await DatabaseService.getStatistics()
    console.log('\n📊 Database Statistics:')
    console.log(`   Total items: ${stats.total}`)
    console.log(`   Categories: ${Object.keys(stats.byCategory).length}`)
    console.log(`   Types: ${Object.keys(stats.byType).length}`)

    console.log('\n🎉 Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()