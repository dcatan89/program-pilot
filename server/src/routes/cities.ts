import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } })
  res.json(cities)
})

router.post('/', async (req, res) => {
  const city = await prisma.city.create({ data: req.body })
  res.status(201).json(city)
})

router.put('/:id', async (req, res) => {
  const city = await prisma.city.update({ where: { id: req.params.id }, data: req.body })
  res.json(city)
})

router.delete('/:id', async (req, res) => {
  await prisma.city.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
