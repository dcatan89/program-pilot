import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /shifts?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query as { start: string; end: string }
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      include: {
        staff: true,
        city: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
    res.json(shifts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /shifts
router.post('/', async (req, res) => {
  try {
    const { staffId, cityId, date, startTime, endTime, location, sessionType, notes } = req.body
    const shift = await prisma.shift.create({
      data: {
        staffId,
        cityId,
        date: new Date(date),
        startTime,
        endTime,
        location,
        sessionType: sessionType ?? 'AM',
        notes: notes || null,
      },
      include: { staff: true, city: true },
    })
    res.status(201).json(shift)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /shifts/:id
router.put('/:id', async (req, res) => {
  try {
    const { staffId, cityId, date, startTime, endTime, location, sessionType, notes } = req.body
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        ...(staffId !== undefined && { staffId }),
        ...(cityId !== undefined && { cityId }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(location !== undefined && { location }),
        ...(sessionType !== undefined && { sessionType }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { staff: true, city: true },
    })
    res.json(shift)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /shifts/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.shift.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
