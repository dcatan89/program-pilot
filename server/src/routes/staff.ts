import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'
import { validateBody, z_cuid, z_isoDate } from '../lib/validate'

const router = Router()
router.use(requireAuth)

const createSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Must be a valid email').optional().or(z.literal('')),
  phone:   z.string().optional(),
  notes:   z.string().optional(),
  cityIds: z.array(z_cuid).optional(),
})

const updateSchema = createSchema.extend({
  isActive: z.boolean().optional(),
})

router.get('/', async (_req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      include: { clearedCities: { include: { city: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(staff)
  } catch (err) {
    logger.error(err, 'GET /staff failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
      include: {
        clearedCities: { include: { city: true } },
        assignments: { include: { session: { include: { city: true, program: true } } } },
        availability: { orderBy: { startDate: 'asc' } },
      },
    })
    if (!staff) return res.status(404).json({ error: 'Not found' })
    res.json(staff)
  } catch (err) {
    logger.error(err, 'GET /staff/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const { name, email, phone, notes, cityIds } = req.body
    const staff = await prisma.staff.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        clearedCities: cityIds?.length
          ? { create: cityIds.map((cityId: string) => ({ cityId })) }
          : undefined,
      },
      include: { clearedCities: { include: { city: true } } },
    })
    res.status(201).json(staff)
  } catch (err) {
    logger.error(err, 'POST /staff failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', validateBody(updateSchema), async (req, res) => {
  try {
    const { name, email, phone, notes, isActive, cityIds } = req.body
    await prisma.staffCity.deleteMany({ where: { staffId: req.params.id } })
    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        ...(isActive !== undefined && { isActive }),
        clearedCities: cityIds?.length
          ? { create: cityIds.map((cityId: string) => ({ cityId })) }
          : undefined,
      },
      include: { clearedCities: { include: { city: true } } },
    })
    res.json(staff)
  } catch (err) {
    logger.error(err, 'PUT /staff/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.staff.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /staff/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Availability (time off) endpoints
const availabilitySchema = z.object({
  startDate: z_isoDate,
  endDate:   z_isoDate,
  note:      z.string().optional(),
})

router.get('/:id/availability', async (req, res) => {
  try {
    const blocks = await prisma.staffAvailability.findMany({
      where: { staffId: req.params.id },
      orderBy: { startDate: 'asc' },
    })
    res.json(blocks)
  } catch (err) {
    logger.error(err, 'GET /staff/:id/availability failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/availability', validateBody(availabilitySchema), async (req, res) => {
  try {
    const { startDate, endDate, note } = req.body
    const block = await prisma.staffAvailability.create({
      data: {
        staffId: req.params.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        note: note || null,
      },
    })
    res.status(201).json(block)
  } catch (err) {
    logger.error(err, 'POST /staff/:id/availability failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id/availability/:blockId', async (req, res) => {
  try {
    await prisma.staffAvailability.delete({ where: { id: req.params.blockId } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /staff/:id/availability/:blockId failed')
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
