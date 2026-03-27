import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  const staff = await prisma.staff.findMany({
    include: { clearedCities: { include: { city: true } } },
    orderBy: { name: 'asc' }
  })
  res.json(staff)
})

router.get('/:id', async (req, res) => {
  const staff = await prisma.staff.findUnique({
    where: { id: req.params.id },
    include: {
      clearedCities: { include: { city: true } },
      assignments: { include: { session: { include: { city: true, program: true } } } }
    }
  })
  if (!staff) return res.status(404).json({ error: 'Not found' })
  res.json(staff)
})

router.post('/', async (req, res) => {
  const { name, email, phone, notes, cityIds } = req.body
  const staff = await prisma.staff.create({
    data: {
      name, email, phone, notes,
      clearedCities: cityIds?.length
        ? { create: cityIds.map((cityId: string) => ({ cityId })) }
        : undefined
    },
    include: { clearedCities: { include: { city: true } } }
  })
  res.status(201).json(staff)
})

router.put('/:id', async (req, res) => {
  const { name, email, phone, notes, isActive, cityIds } = req.body
  await prisma.staffCity.deleteMany({ where: { staffId: req.params.id } })
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: {
      name, email, phone, notes, isActive,
      clearedCities: cityIds?.length
        ? { create: cityIds.map((cityId: string) => ({ cityId })) }
        : undefined
    },
    include: { clearedCities: { include: { city: true } } }
  })
  res.json(staff)
})

router.delete('/:id', async (req, res) => {
  await prisma.staff.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
