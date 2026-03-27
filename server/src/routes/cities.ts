import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'
import { validateBody, z_hexColor } from '../lib/validate'

const router = Router()
router.use(requireAuth)

const createSchema = z.object({
  name:  z.string().min(1, 'Name is required'),
  color: z_hexColor.optional(),
})

const updateSchema = z.object({
  name:  z.string().min(1).optional(),
  color: z_hexColor.optional(),
})

router.get('/', async (_req, res) => {
  try {
    const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } })
    res.json(cities)
  } catch (err) {
    logger.error(err, 'GET /cities failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const city = await prisma.city.create({ data: req.body })
    res.status(201).json(city)
  } catch (err) {
    logger.error(err, 'POST /cities failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', validateBody(updateSchema), async (req, res) => {
  try {
    const city = await prisma.city.update({ where: { id: req.params.id }, data: req.body })
    res.json(city)
  } catch (err) {
    logger.error(err, 'PUT /cities/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.city.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /cities/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
