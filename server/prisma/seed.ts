import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const hashed = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@programpilot.com' },
    update: {},
    create: { email: 'admin@programpilot.com', password: hashed, name: 'Admin', role: 'SUPER_ADMIN' }
  })

  // Cities
  const cities = [
    { name: 'Irvine', color: '#2E75B6' },
    { name: 'Newport', color: '#1F7A3E' },
    { name: 'AV', color: '#7F6000' },
    { name: 'RSM', color: '#6A0DAD' },
    { name: 'Yorba Linda', color: '#C55A11' },
    { name: 'Tustin', color: '#C00000' },
  ]
  for (const city of cities) {
    await prisma.city.upsert({ where: { name: city.name }, update: {}, create: city })
  }

  // Staff
  const staffList = [
    { name: 'Morgan' }, { name: 'Justin' }, { name: 'Javier Ceja Sandoval' },
    { name: 'Zakkai Geisick' }, { name: "Daniel 'DJ' Catan" },
    { name: 'Evan Le' }, { name: "Robert 'Bobby' Pavelko" },
    { name: 'Justin Lopez' }, { name: 'Paul Cho', notes: 'Leaves on mission trip June–July 9' },
    { name: 'Laura Jones' },
  ]
  for (const s of staffList) {
    await prisma.staff.upsert({
      where: { email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@brainstorm.com` },
      update: {},
      create: { ...s, email: `${s.name.toLowerCase().replace(/[^a-z]/g, '.')}@brainstorm.com` }
    })
  }

  // NMUSD external program
  await prisma.externalProgram.upsert({
    where: { id: 'nmusd-2026' },
    update: {},
    create: {
      id: 'nmusd-2026',
      name: 'NMUSD Summer Program',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-07-10'),
      color: '#F97316',
      notes: 'Runs concurrently with city camps — flag staff overlaps'
    }
  })

  // Active season
  await prisma.season.upsert({
    where: { id: 'summer-2026' },
    update: {},
    create: { id: 'summer-2026', name: 'Summer 2026', year: 2026, isActive: true }
  })

  console.log('✅ Seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
